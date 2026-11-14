import asyncio
import ast
import shlex
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.event import SecurityEvent
from app.models.detection import DetectionFinding
from app.models.simulation import AttackSimulationExecution
from app.schemas.simulation import SimulationLaunchRequest
from app.services import simulation_service as module
from app.services.simulation_service import SimulationService


def test_network_script_honors_protocol_port_and_reports_failure(monkeypatch):
    import socket
    import time
    connections, datagrams = [], []

    class FakeSocket:
        def __enter__(self): return self
        def __exit__(self, *_): pass
        def sendall(self, data): assert b'Host: 10.0.0.11\r\n' in data
        def recv(self, size): return b'HTTP/1.1 200 OK\r\n'
        def sendto(self, payload, target): datagrams.append(target)

    def connect(target, timeout):
        connections.append(target)
        return FakeSocket()

    monkeypatch.setattr(socket, 'create_connection', connect)
    monkeypatch.setattr(socket, 'socket', lambda *_: FakeSocket())
    monkeypatch.setattr(time, 'sleep', lambda _: None)
    service = SimulationService()
    for protocol, port in [('TCP', 80), ('UDP', 9999)]:
        command = service._generate_remote_script('net_traffic_burst', '10.0.0.11', {
            'packet_count': 20, 'protocol': protocol, 'destination_port': port})
        script = shlex.split(command)[-1]
        ast.parse(script)
        with pytest.raises(SystemExit) as result:
            exec(compile(script, '<remote-script>', 'exec'), {})
        assert result.value.code == 0
    assert connections == [('10.0.0.11', 80)] * 20
    assert datagrams == [('10.0.0.11', 9999)] * 20
    monkeypatch.setattr(socket, 'create_connection', lambda *_args, **_kwargs: (_ for _ in ()).throw(OSError('Connection refused')))
    with pytest.raises(SystemExit) as result:
        exec(compile(shlex.split(service._generate_remote_script('net_traffic_burst', '10.0.0.11', {'packet_count': 20}))[-1], '<remote-script>', 'exec'), {})
    assert result.value.code == 1
    with pytest.raises(ValueError, match='protocol'):
        service._generate_remote_script('net_traffic_burst', '10.0.0.11', {'protocol': 'BAD'})
    with pytest.raises(ValueError, match='port'):
        service._generate_remote_script('net_traffic_burst', '10.0.0.11', {'destination_port': 0})
    assert SimulationLaunchRequest(scenario_id='net_traffic_burst').target_ip is None


def make_execution():
    return AttackSimulationExecution(execution_id='SIM-TEST', scenario_category='Network', scenario_id='net_traffic_burst',
        scenario_name='Test', attacker_ip='10.0.0.12', target_ip='10.0.0.11', status='RUNNING',
        start_time=datetime.now(timezone.utc))


def test_linkage_excludes_simulated_and_unrelated_traffic():
    engine = create_engine('sqlite://')
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    now = datetime.now(timezone.utc)
    with factory() as db:
        execution = make_execution()
        db.add(execution)
        for number, source, simulated in [(1, '10.0.0.12', False), (2, '10.0.0.12', True), (3, '1.2.3.4', False)]:
            db.add(SecurityEvent(event_id=f'NET-{number}', event_type='network_connection', ingested_at=now,
                source_ip=source, destination_ip='10.0.0.11', is_simulated=simulated))
        db.add(DetectionFinding(finding_id='LINKED-ML', rule_id='RULE-ML-001', rule_name='ML test',
            detection_method='SUPERVISED_ML', severity='MEDIUM', confidence=0.8,
            explanation='Test', evidence={'event_ids': ['NET-1']}, timestamp=now))
        db.add(DetectionFinding(finding_id='UNRELATED', rule_id='RULE-NET-001', rule_name='Unrelated test',
            detection_method='RULE_BASED', severity='MEDIUM', confidence=0.8,
            explanation='Test', evidence={'event_ids': ['NET-3']}, timestamp=now))
        db.commit()
        SimulationService()._correlate_soc_pipeline(db, execution, now-timedelta(seconds=5), now+timedelta(seconds=5))
        assert execution.associated_event_ids == ['NET-1']
        assert execution.flow_status == 'CAPTURED'
        assert execution.ml_status == 'DETECTED'
        assert execution.associated_finding_ids == ['LINKED-ML']
    engine.dispose()


@pytest.mark.asyncio
async def test_deadline_includes_silent_output_and_kills_child(monkeypatch):
    engine = create_engine('sqlite://')
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    with factory() as db:
        db.add(make_execution())
        db.commit()

    class SilentProcess:
        returncode = None
        def __init__(self): self.stdout = self
        async def readline(self): await asyncio.sleep(10)
        async def wait(self): return self.returncode
        def kill(self): self.returncode = -9

    process = SilentProcess()
    async def create(*_args, **_kwargs): return process
    monkeypatch.setattr(module, 'SessionLocal', factory)
    monkeypatch.setattr(module.asyncio, 'create_subprocess_exec', create)
    monkeypatch.setattr(module.settings, 'ATTACK_SIMULATION_TIMEOUT', 0.01)
    monkeypatch.setattr(module.broadcaster, 'publish_sync', lambda *_: None)
    service = SimulationService()
    await service._run_simulation_task('SIM-TEST', 'net_traffic_burst', '10.0.0.11', {})
    assert process.returncode == -9
    with factory() as db:
        execution = db.query(AttackSimulationExecution).one()
        assert execution.status == 'FAILED'
        assert execution.error_message == 'TimeoutError'
    engine.dispose()


def test_removed_scenarios_are_not_available():
    service = SimulationService()
    ids = {scenario.scenario_id for scenario in service.get_scenarios()}
    for removed in ('auth_failed_pass', 'web_path_enum'):
        assert removed not in ids
        with pytest.raises(ValueError, match='Unsupported scenario'):
            service._generate_remote_script(removed, '10.0.0.11', {})
    assert 'net_traffic_burst' in ids
