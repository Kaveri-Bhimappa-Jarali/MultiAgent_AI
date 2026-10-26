import pytest
import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.vm_node import VMNode, VMAction
from app.models.incident import Incident
from app.services.detection_service import seed_detection_rules
from app.services.threat_intel_service import seed_threat_intelligence
from app.services.vm_service import (
    seed_default_vm_nodes,
    get_lab_nodes_status,
    record_vm_heartbeat,
    ingest_vm_telemetry,
    get_pending_vm_actions,
    record_vm_action_result
)

@pytest.fixture(scope="module")
def db_session():
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=test_engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSession()

    seed_detection_rules(session)
    seed_threat_intelligence(session)
    seed_default_vm_nodes(session)

    yield session
    session.close()

def test_seed_and_list_vm_nodes(db_session):
    """
    Verifies that the 3 canonical enterprise network nodes from the synopsis
    are seeded with correct subnets, roles, and collectors.
    """
    nodes = get_lab_nodes_status(db_session)
    assert len(nodes) >= 3

    roles = {n["role"]: n for n in nodes}
    assert "ENDPOINT" in roles
    assert "SERVER" in roles
    assert "ATTACKER" in roles

    # Verify IP allocations per architecture
    assert roles["ENDPOINT"]["ip_address"] == "192.168.56.10"
    assert roles["SERVER"]["ip_address"] == "192.168.56.15"
    assert roles["ATTACKER"]["ip_address"] == "192.168.56.20"

def test_vm_heartbeat_reporting(db_session):
    """
    Verifies that guest telemetry daemons report periodic heartbeats with system metrics.
    """
    metrics = {"cpu_percent": 4.2, "memory_mb": 512, "disk_gb_free": 18.5}
    node = record_vm_heartbeat(
        db_session,
        vm_id="vm-server-01",
        ip_address="192.168.56.15",
        system_metrics=metrics,
        active_collectors=["auth_log", "ssh_monitor", "iptables"]
    )
    assert node is not None
    assert node.status == "CONNECTED"
    assert node.system_metrics["cpu_percent"] == 4.2
    assert "iptables" in node.active_collectors

def test_vm_authentic_telemetry_ingress(db_session):
    """
    Verifies authentic security telemetry sent by the guest VM daemon
    is accepted with is_simulated=False, source_type=VM_SERVER, and ingested.
    """
    raw_events = [
        {
            "event_type": "authentication",
            "severity": "HIGH",
            "source_ip": "192.168.56.20",
            "destination_ip": "192.168.56.15",
            "destination_port": 22,
            "username": "sarah.connor",
            "host": "vm-server-01",
            "file_action": "FAILED",
            "command_line": "sshd[2204]: Failed password for invalid user sarah.connor from 192.168.56.20 port 50412 ssh2",
            "collector_source": "auth.log"
        }
    ]

    res = ingest_vm_telemetry(db_session, "vm-server-01", raw_events)
    assert res["accepted"] == 1
    assert res["queued"] == 1

    # Check node status updated to RECEIVING_TELEMETRY
    server_node = db_session.query(VMNode).filter(VMNode.vm_id == "vm-server-01").first()
    assert server_node.status == "RECEIVING_TELEMETRY"
    assert server_node.events_count >= 1

def test_vm_soar_containment_action_lifecycle(db_session):
    """
    Verifies SOAR containment command delivery to VM node, execution reporting, and state verification.
    """
    # 1. SOC queues a containment command
    act = VMAction(
        action_id="VMACT-TEST-001",
        vm_id="vm-server-01",
        action_type="IPTABLES_BLOCK_IP",
        target_value="192.168.56.20",
        command_to_run="iptables -A INPUT -s 192.168.56.20 -j DROP",
        status="PENDING_VM_PULL",
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(act)
    db_session.commit()

    # 2. Guest agent polls pending actions
    pending = get_pending_vm_actions(db_session, "vm-server-01")
    assert len(pending) >= 1
    target_action = next(a for a in pending if a["action_id"] == "VMACT-TEST-001")
    assert target_action["command_to_run"] == "iptables -A INPUT -s 192.168.56.20 -j DROP"

    # 3. Guest agent reports execution result
    exec_result = {
        "success": True,
        "stdout": "Rule added to netfilter table INPUT",
        "returncode": 0
    }
    updated = record_vm_action_result(db_session, "VMACT-TEST-001", exec_result)
    assert updated.status == "EXECUTED_ON_VM"
    assert updated.vm_execution_result["returncode"] == 0
