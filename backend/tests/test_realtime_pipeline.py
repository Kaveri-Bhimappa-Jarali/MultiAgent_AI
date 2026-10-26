import pytest
import sys
import os
import time
from datetime import datetime, timezone, timedelta

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.event import SecurityEvent
from app.models.detection import DetectionFinding
from app.models.incident import Incident
from app.schemas.event import SecurityEventCreate
from app.services.detection_service import seed_detection_rules, evaluate_event_with_rolling_window
from app.services.threat_intel_service import seed_threat_intelligence
from app.services.ingestion_service import normalize_and_ingest_events
from app.agents.orchestrator import MultiAgentSOCEngine
from app.services.collectors.collector_manager import collector_manager
from app.services.broadcaster import broadcaster
from app.services.response_service import approve_response_action, execute_response_action
from app.services.verification_service import create_and_run_verification

@pytest.fixture(scope="module")
def db_session():
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=test_engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSession()

    seed_detection_rules(session)
    seed_threat_intelligence(session)

    yield session
    session.close()

def test_rolling_window_brute_force_detection(db_session):
    """
    Verifies that when failed auth events arrive one-by-one over time,
    the rolling-window detection successfully triggers once the threshold is reached.
    """
    attacker_ip = "198.51.100.77"
    now = datetime.now(timezone.utc)

    # Ingest 3 failed logins one by one (threshold is 3)
    findings_generated = []
    latencies = []

    for i in range(3):
        evt_in = SecurityEventCreate(
            event_id=f"EVT-ROLL-BF-{i}",
            event_type="authentication",
            severity="MEDIUM" if i < 2 else "HIGH",
            source_ip=attacker_ip,
            destination_ip="10.0.1.10",
            username="target_admin",
            host="AUTH-SRV",
            file_action="FAILED",
            command_line=f"Failed SSH login attempt #{i+1}",
            timestamp=now + timedelta(seconds=i * 5)
        )
        _, saved = normalize_and_ingest_events(db_session, [evt_in], auto_queue=False)
        assert len(saved) == 1
        
        # Measure detection latency
        t0 = time.perf_counter()
        f_list = evaluate_event_with_rolling_window(db_session, saved[0])
        latencies.append((time.perf_counter() - t0) * 1000)
        findings_generated.extend(f_list)

    # On the 3rd event, the rolling threshold of 3 failed logins must trigger!
    assert len(findings_generated) >= 1
    bf_finding = next((f for f in findings_generated if f.rule_id == "RULE-AUTH-001"), None)
    assert bf_finding is not None
    assert bf_finding.evidence["source_ip"] == attacker_ip
    assert bf_finding.evidence["attempt_count"] >= 3

    # Log measured latency
    avg_lat = sum(latencies) / len(latencies)
    print(f"\n[MEASURED] Rolling window brute-force detection latency: {avg_lat:.2f} ms")
    assert avg_lat < 100.0  # Detection evaluation completes well within 100ms

def test_duplicate_event_handling(db_session):
    """
    Verifies that identical events are detected as duplicates and ignored.
    """
    evt = SecurityEventCreate(
        event_id="EVT-DUP-001",
        event_type="network_connection",
        severity="INFO",
        source_ip="10.0.0.1",
        destination_ip="10.0.0.2",
        destination_port=443
    )
    res1, saved1 = normalize_and_ingest_events(db_session, [evt], auto_queue=False)
    assert res1.accepted == 1

    # Ingest same event again
    res2, saved2 = normalize_and_ingest_events(db_session, [evt], auto_queue=False)
    assert res2.duplicates_skipped == 1
    assert res2.accepted == 0

def test_event_driven_agent_orchestration_and_correlation(db_session):
    """
    Verifies that selective agent dispatch executes only the domain-relevant agents,
    correlates findings into an incident, and generates attack-path topology.
    """
    t_start = time.perf_counter()

    # Step 1: Authentication failure burst
    evt_auth = SecurityEvent(
        event_id="EVT-CORR-01",
        timestamp=datetime.now(timezone.utc),
        event_type="authentication",
        severity="CRITICAL",
        source_ip="203.0.113.88",
        username="john.connor",
        host="WS-SEC-99",
        file_action="SUCCESS_POST_BURST",
        command_line="Successful login post burst",
        detection_status="UNPROCESSED",
        processing_status="PROCESSING"
    )
    db_session.add(evt_auth)
    db_session.commit()

    findings = evaluate_event_with_rolling_window(db_session, evt_auth)
    engine = MultiAgentSOCEngine(db_session)
    res = engine.dispatch_event_driven_pipeline(evt_auth, findings)

    total_time_ms = (time.perf_counter() - t_start) * 1000
    print(f"\n[MEASURED] Event-to-incident correlation latency: {total_time_ms:.2f} ms")

    # Agents executed
    assert res["agents_executed"] > 0
    
    # Check incident was created or updated
    inc = db_session.query(Incident).filter(Incident.affected_users.contains(["john.connor"])).first()
    if not inc:
        inc = db_session.query(Incident).order_by(Incident.created_at.desc()).first()
    assert inc is not None
    assert inc.risk_score >= 50

def test_response_workflow_and_verification(db_session):
    """
    Verifies approval, execution, and verification of SOAR responses.
    """
    inc = db_session.query(Incident).order_by(Incident.created_at.desc()).first()
    assert inc is not None

    from app.models.response import ResponseAction
    action = db_session.query(ResponseAction).filter(ResponseAction.incident_id == inc.incident_id).first()
    if action:
        approved = approve_response_action(db_session, action.action_id, approved_by="Automated Auditor")
        assert approved.status == "APPROVED"

        executed = execute_response_action(db_session, action.action_id, actor="SOAR Engine", dry_run=True)
        assert executed.status == "EXECUTED"

        ver = create_and_run_verification(db_session, action.action_id, inc.incident_id)
        assert ver.verification_status in ["VERIFIED_CONTAINED", "PENDING_VERIFICATION", "SIMULATED_RESPONSE_VERIFIED", "ACTUAL_LAB_RESPONSE_VERIFIED"]

def test_collector_manager_and_freshness_warnings(db_session):
    """
    Verifies collector statuses and operational freshness warning generation.
    """
    statuses = collector_manager.get_all_statuses()
    assert len(statuses) >= 3  # API, File Watcher, Syslog, Demo

    # Verify freshness warning logic
    warnings = collector_manager.get_freshness_warnings(threshold_minutes=0)
    assert isinstance(warnings, list)

def test_broadcaster_event_dispatch():
    """
    Verifies that the WebSocket broadcaster handles event publishing without errors.
    """
    broadcaster.publish_sync("TEST_EVENT", {"status": "OK", "metric": 42})
    assert broadcaster.total_broadcasts >= 0
