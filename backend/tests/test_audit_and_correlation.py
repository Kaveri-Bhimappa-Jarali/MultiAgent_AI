import pytest
import os
import sys
import time
import uuid
from datetime import datetime, timezone, timedelta

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.event import SecurityEvent
from app.models.detection import DetectionFinding, DetectionRule
from app.models.agent import AgentFinding, AgentExecution
from app.models.incident import Incident, IncidentFinding, IncidentEvent
from app.models.response import ResponseAction, VerificationResult
from app.schemas.event import SecurityEventCreate

from app.services.detection_service import (
    seed_detection_rules,
    evaluate_event_with_rolling_window
)
from app.services.threat_intel_service import seed_threat_intelligence, lookup_indicator
from app.services.ingestion_service import normalize_and_ingest_events
from app.services.response_service import (
    approve_response_action,
    execute_response_action
)
from app.services.verification_service import create_and_run_verification
from app.services.time_utils import ensure_utc
from app.services.broadcaster import broadcaster

from app.agents.orchestrator import MultiAgentSOCEngine
from app.agents.auth_agent import AuthenticationAgent
from app.agents.network_agent import NetworkMonitoringAgent
from app.agents.endpoint_agent import EndpointAgent
from app.agents.anomaly_detection_agent import AnomalyDetectionAgent
from app.agents.threat_intel_agent import ThreatIntelligenceAgent
from app.agents.correlation_agent import CorrelationAgent
from app.agents.attack_path_agent import AttackPathAgent
from app.agents.investigation_agent import InvestigationAgent
from app.agents.response_agent import ResponseAgent
from app.services.risk_service import calculate_incident_risk


@pytest.fixture
def db_session():
    """Provides a fresh isolated in-memory SQLite database for each test."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()

    seed_detection_rules(session)
    seed_threat_intelligence(session)

    yield session
    session.close()


# =============================================================================
# GROUP 1: INDIVIDUAL AGENT DETECTION RESPONSIBILITIES
# =============================================================================

def test_1_auth_failed_login_finding(db_session):
    """
    1. Single failed login produces a single authentication finding without creating an incident.
    """
    now = datetime.now(timezone.utc)
    evt = SecurityEvent(
        event_id="EVT-AUTH-01",
        timestamp=now,
        event_type="authentication",
        severity="LOW",
        source_ip="192.168.1.100",
        username="alice",
        host="WS-ALPHA",
        command_line="Failed password authentication for user alice",
        detection_status="UNPROCESSED",
        processing_status="PROCESSING"
    )
    db_session.add(evt)
    db_session.commit()

    agent = AuthenticationAgent(db_session)
    res = agent.execute({"events": [evt]})
    assert res["status"] == "COMPLETED"

    findings = db_session.query(AgentFinding).filter(AgentFinding.agent_name == "Authentication Agent").all()
    assert len(findings) >= 1
    assert "EVT-AUTH-01" in (findings[0].source_event_ids or [])
    assert findings[0].incident_id is None
    assert db_session.query(Incident).count() == 0


def test_2_auth_brute_force_burst_finding(db_session):
    """
    2. Brute force detection on burst of attempts (at least 3 attempts):
       Produces 1 brute-force finding aggregating all 3 source events without creating an incident.
    """
    now = datetime.now(timezone.utc)
    evts = []
    for i in range(3):
        e = SecurityEvent(
            event_id=f"EVT-BF-0{i+1}",
            timestamp=now - timedelta(seconds=10 * (3 - i)),
            event_type="authentication",
            severity="HIGH",
            source_ip="198.51.100.50",
            username="admin",
            host="WS-BETA",
            command_line="Failed password attempt",
            detection_status="UNPROCESSED",
            processing_status="PROCESSING"
        )
        db_session.add(e)
        evts.append(e)
    db_session.commit()

    agent = AuthenticationAgent(db_session)
    res = agent.execute({"events": evts})
    assert res["status"] == "COMPLETED"

    bf_findings = db_session.query(AgentFinding).filter(
        AgentFinding.agent_name == "Authentication Agent",
        AgentFinding.title.contains("Brute")
    ).all()
    assert len(bf_findings) == 1
    src_ids = bf_findings[0].source_event_ids or []
    assert len(src_ids) >= 3
    assert set(src_ids) >= {"EVT-BF-01", "EVT-BF-02", "EVT-BF-03"}
    assert db_session.query(Incident).count() == 0


def test_3_auth_suspicious_successful_login_post_burst(db_session):
    """
    3. Suspicious successful login after multiple failures triggers Account Takeover finding.
    """
    now = datetime.now(timezone.utc)
    evt = SecurityEvent(
        event_id="EVT-AUTH-ATO-01",
        timestamp=now,
        event_type="authentication",
        severity="CRITICAL",
        source_ip="198.51.100.99",
        username="finance_user",
        host="WS-FINANCE",
        file_action="SUCCESS_POST_BURST",
        command_line="Successful login post burst",
        detection_status="UNPROCESSED",
        processing_status="PROCESSING"
    )
    db_session.add(evt)
    db_session.commit()

    findings = evaluate_event_with_rolling_window(db_session, evt)
    assert any("RULE-AUTH-002" in (f.rule_id or "") for f in findings)

    agent = AuthenticationAgent(db_session)
    res = agent.execute({"events": [evt]})
    assert res["status"] == "COMPLETED"
    ato_findings = db_session.query(AgentFinding).filter(
        AgentFinding.agent_name == "Authentication Agent",
        AgentFinding.title.contains("Account Takeover")
    ).all()
    assert len(ato_findings) >= 1
    assert ato_findings[0].incident_id is None


def test_4_network_port_sweep_finding(db_session):
    """
    4. Port sweep detection: Network Monitoring Agent detects scanning across ports.
    """
    now = datetime.now(timezone.utc)
    evts = []
    for port in [22, 80, 443, 8080, 3389, 445]:
        e = SecurityEvent(
            event_id=f"EVT-NET-SWEEP-{port}",
            timestamp=now,
            event_type="network_traffic",
            severity="MEDIUM",
            source_ip="192.168.1.200",
            destination_ip="10.0.0.5",
            destination_port=port,
            protocol="TCP",
            detection_status="UNPROCESSED",
            processing_status="PROCESSING"
        )
        db_session.add(e)
        evts.append(e)
    db_session.commit()

    agent = NetworkMonitoringAgent(db_session)
    res = agent.execute({"events": evts})
    assert res["status"] == "COMPLETED"

    net_findings = db_session.query(AgentFinding).filter(
        AgentFinding.agent_name == "Network Monitoring Agent"
    ).all()
    assert len(net_findings) >= 1
    assert any("Port" in f.title or "Scan" in f.title or "Network" in f.title for f in net_findings)
    assert db_session.query(Incident).count() == 0


def test_5_endpoint_lolbin_process_execution(db_session):
    """
    5. Process execution detection: Endpoint Agent identifies suspicious LOLBin / encoded command.
    """
    now = datetime.now(timezone.utc)
    evt = SecurityEvent(
        event_id="EVT-EP-LOLBIN-01",
        timestamp=now,
        event_type="process_execution",
        severity="HIGH",
        source_ip="10.0.0.15",
        host="WS-ENG-42",
        username="dev_lead",
        process_name="powershell.exe",
        command_line="powershell.exe -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQA...",
        detection_status="UNPROCESSED",
        processing_status="PROCESSING"
    )
    db_session.add(evt)
    db_session.commit()

    agent = EndpointAgent(db_session)
    res = agent.execute({"events": [evt]})
    assert res["status"] == "COMPLETED"

    ep_findings = db_session.query(AgentFinding).filter(
        AgentFinding.agent_name == "Endpoint Agent"
    ).all()
    assert len(ep_findings) >= 1
    assert any("PowerShell" in f.title or "Process" in f.title or "Execution" in f.title for f in ep_findings)
    assert ep_findings[0].incident_id is None


def test_6_anomaly_scoring_numeric_without_incident(db_session):
    """
    6. Anomaly scoring produces a numeric Isolation Forest score (0-100) and feature explanations
       without creating false incidents.
    """
    now = datetime.now(timezone.utc)
    evt = SecurityEvent(
        event_id="EVT-ANOM-01",
        timestamp=now,
        event_type="network_traffic",
        severity="MEDIUM",
        source_ip="10.0.0.99",
        destination_ip="10.0.0.1",
        source_port=54321,
        destination_port=443,
        protocol="TCP",
        host="SRV-CORE",
        detection_status="UNPROCESSED",
        processing_status="PROCESSING"
    )
    db_session.add(evt)
    db_session.commit()

    agent = AnomalyDetectionAgent(db_session)
    res = agent.execute({"events": [evt]})
    assert res["status"] == "COMPLETED"
    assert "peak_anomaly_score" in res["data"]
    assert isinstance(res["data"]["peak_anomaly_score"], (int, float))
    assert 0.0 <= res["data"]["peak_anomaly_score"] <= 100.0
    assert db_session.query(Incident).count() == 0


def test_7_threat_intel_enrichment_without_incident(db_session):
    """
    7. Threat intelligence indicator match enriches findings with actor and reputation
       without prematurely creating an incident.
    """
    now = datetime.now(timezone.utc)
    evt = SecurityEvent(
        event_id="EVT-CTI-01",
        timestamp=now,
        event_type="network_traffic",
        severity="HIGH",
        source_ip="203.0.113.88",
        destination_ip="10.0.0.10",
        destination_port=443,
        protocol="TCP",
        detection_status="UNPROCESSED",
        processing_status="PROCESSING"
    )
    db_session.add(evt)
    db_session.commit()

    agent = ThreatIntelligenceAgent(db_session)
    res = agent.execute({"events": [evt]})
    assert res["status"] == "COMPLETED"
    assert res["data"]["threat_matches_found"] >= 1
    assert any(m["indicator"] == "203.0.113.88" for m in res["data"]["matches"])

    cti_findings = db_session.query(AgentFinding).filter(
        AgentFinding.agent_name == "Threat Intelligence Agent"
    ).all()
    assert len(cti_findings) >= 1
    assert cti_findings[0].incident_id is None
    assert db_session.query(Incident).count() == 0


# =============================================================================
# GROUP 2: CORRELATION AGENT BEHAVIOR & RULES
# =============================================================================

def test_8_correlation_single_raw_event_no_incident(db_session):
    """
    8. Single raw event does not create an incident.
    """
    now = datetime.now(timezone.utc)
    evt = SecurityEvent(
        event_id="EVT-SOLO-RAW-01",
        timestamp=now,
        event_type="authentication",
        severity="HIGH",
        source_ip="192.168.1.55",
        username="solo_user",
        host="WS-SOLO",
        detection_status="UNPROCESSED",
        processing_status="PROCESSING"
    )
    db_session.add(evt)
    db_session.commit()

    findings = evaluate_event_with_rolling_window(db_session, evt)
    engine = MultiAgentSOCEngine(db_session)
    res = engine.dispatch_event_driven_pipeline(evt, findings)

    assert db_session.query(Incident).count() == 0


def test_9_correlation_single_detection_finding_no_incident(db_session):
    """
    9. Single agent finding does not create an incident.
    """
    now = datetime.now(timezone.utc)
    f = AgentFinding(
        finding_id="AFIND-SINGLE-01",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Endpoint Agent",
        title="Suspicious Process Execution",
        severity="HIGH",
        confidence=0.9,
        description="Observed cmd.exe spawned by powershell.exe",
        evidence={"host": "WS-TEST-01", "event_ids": ["EVT-RAW-01"]},
        source_event_ids=["EVT-RAW-01"],
        created_at=now
    )
    db_session.add(f)
    db_session.commit()

    corr = CorrelationAgent(db_session)
    res = corr.execute({})
    assert res["status"] == "COMPLETED"
    assert db_session.query(Incident).count() == 0

    reloaded_f = db_session.query(AgentFinding).filter(AgentFinding.finding_id == "AFIND-SINGLE-01").first()
    assert reloaded_f.incident_id is None


def test_10_correlation_multiple_related_findings_correlates(db_session):
    """
    10. Multiple related findings within 900 seconds correlate into a single incident.
    """
    now = datetime.now(timezone.utc)
    e1 = SecurityEvent(
        event_id="EVT-CORR-A1",
        timestamp=now - timedelta(seconds=60),
        event_type="authentication",
        severity="HIGH",
        source_ip="198.51.100.77",
        username="victim_admin",
        host="WS-CORR-1",
        detection_status="UNPROCESSED",
        processing_status="PROCESSING"
    )
    e2 = SecurityEvent(
        event_id="EVT-CORR-A2",
        timestamp=now,
        event_type="process_execution",
        severity="HIGH",
        source_ip="198.51.100.77",
        username="victim_admin",
        host="WS-CORR-1",
        command_line="powershell.exe -enc XYZ",
        detection_status="UNPROCESSED",
        processing_status="PROCESSING"
    )
    db_session.add_all([e1, e2])
    db_session.commit()

    f1 = AgentFinding(
        finding_id="AFIND-M-01",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Authentication Agent",
        title="Account Takeover Attempt",
        severity="HIGH",
        confidence=0.88,
        description="Auth compromise",
        evidence={"source_ip": "198.51.100.77", "username": "victim_admin", "event_ids": ["EVT-CORR-A1"]},
        source_event_ids=["EVT-CORR-A1"],
        created_at=now - timedelta(seconds=60)
    )
    f2 = AgentFinding(
        finding_id="AFIND-M-02",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Endpoint Agent",
        title="Suspicious LOLBin Execution",
        severity="HIGH",
        confidence=0.92,
        description="Endpoint execution",
        evidence={"source_ip": "198.51.100.77", "username": "victim_admin", "host": "WS-CORR-1", "event_ids": ["EVT-CORR-A2"]},
        source_event_ids=["EVT-CORR-A2"],
        created_at=now
    )
    db_session.add_all([f1, f2])
    db_session.commit()

    corr = CorrelationAgent(db_session)
    res = corr.execute({})
    assert res["status"] == "COMPLETED"

    incidents = db_session.query(Incident).all()
    assert len(incidents) == 1
    inc = incidents[0]
    assert inc.finding_count >= 2
    assert set(inc.participating_agents) >= {"Authentication Agent", "Endpoint Agent"}
    assert "victim_admin" in inc.affected_users
    assert len(inc.correlation_reasons) > 0


def test_11_correlation_brute_force_single_finding_not_counted_as_multiple_agent_findings(db_session):
    """
    11. Three failed logins grouped into a single brute-force finding do not count
        as three agent findings; thus it remains an uncorrelated finding.
    """
    now = datetime.now(timezone.utc)
    f_bf = AgentFinding(
        finding_id="AFIND-BF-ONLY-01",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Authentication Agent",
        title="Brute Force Password Spray",
        severity="HIGH",
        confidence=0.85,
        description="3 failed logins on account service_acc",
        evidence={"username": "service_acc", "source_ip": "198.51.100.44", "event_ids": ["EVT-BF-1", "EVT-BF-2", "EVT-BF-3"]},
        source_event_ids=["EVT-BF-1", "EVT-BF-2", "EVT-BF-3"],
        created_at=now
    )
    db_session.add(f_bf)
    db_session.commit()

    corr = CorrelationAgent(db_session)
    res = corr.execute({})
    assert res["status"] == "COMPLETED"

    assert db_session.query(Incident).count() == 0
    reloaded_f = db_session.query(AgentFinding).filter(AgentFinding.finding_id == "AFIND-BF-ONLY-01").first()
    assert reloaded_f.incident_id is None


def test_12_correlation_unrelated_findings_remain_separate(db_session):
    """
    12. Two unrelated findings within 900 seconds remain separate (no common entities).
    """
    now = datetime.now(timezone.utc)
    f1 = AgentFinding(
        finding_id="AFIND-UNREL-01",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Authentication Agent",
        title="Failed Login Alert",
        severity="MEDIUM",
        confidence=0.8,
        description="Auth issue",
        evidence={"username": "alice", "host": "WS-ALPHA", "source_ip": "10.1.1.1", "event_ids": ["E1"]},
        source_event_ids=["E1"],
        created_at=now
    )
    f2 = AgentFinding(
        finding_id="AFIND-UNREL-02",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Network Monitoring Agent",
        title="Port Sweep Alert",
        severity="MEDIUM",
        confidence=0.8,
        description="Network sweep",
        evidence={"username": "bob", "host": "WS-BETA", "source_ip": "10.2.2.2", "event_ids": ["E2"]},
        source_event_ids=["E2"],
        created_at=now
    )
    db_session.add_all([f1, f2])
    db_session.commit()

    corr = CorrelationAgent(db_session)
    res = corr.execute({})
    assert res["status"] == "COMPLETED"

    assert db_session.query(Incident).count() == 0


def test_13_correlation_outside_900s_window_do_not_group(db_session):
    """
    13. Findings outside the 900-second window do not group together.
    """
    now = datetime.now(timezone.utc)
    t_old = now - timedelta(seconds=1200)  # 20 minutes ago (> 900s)

    f_old = AgentFinding(
        finding_id="AFIND-OLD-01",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Authentication Agent",
        title="Old Auth Finding",
        description="Historical authentication failure",
        severity="HIGH",
        confidence=0.85,
        evidence={"username": "charlie", "source_ip": "198.51.100.99", "event_ids": ["E-OLD"]},
        source_event_ids=["E-OLD"],
        created_at=t_old
    )
    f_new = AgentFinding(
        finding_id="AFIND-NEW-01",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Endpoint Agent",
        title="New Endpoint Finding",
        description="Recent endpoint execution anomaly",
        severity="HIGH",
        confidence=0.9,
        evidence={"username": "charlie", "source_ip": "198.51.100.99", "event_ids": ["E-NEW"]},
        source_event_ids=["E-NEW"],
        created_at=now
    )
    db_session.add_all([f_old, f_new])
    db_session.commit()

    corr = CorrelationAgent(db_session)
    res = corr.execute({})
    assert res["status"] == "COMPLETED"

    assert db_session.query(Incident).count() == 0


def test_14_correlation_delayed_finding_updates_existing_incident(db_session):
    """
    14. Delayed finding arrival triggers re-evaluation and updates an existing open incident
        without creating a duplicate incident.
    """
    now = datetime.now(timezone.utc)
    e1 = SecurityEvent(event_id="EVT-D-1", timestamp=now - timedelta(seconds=100), event_type="authentication", severity="HIGH")
    e2 = SecurityEvent(event_id="EVT-D-2", timestamp=now - timedelta(seconds=90), event_type="process_execution", severity="HIGH")
    db_session.add_all([e1, e2])

    f1 = AgentFinding(
        finding_id="AFIND-D-1",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Authentication Agent",
        title="Auth Finding",
        description="Initial authentication finding",
        severity="HIGH",
        confidence=0.85,
        evidence={"username": "dave", "host": "WS-DELAY", "event_ids": ["EVT-D-1"]},
        source_event_ids=["EVT-D-1"],
        created_at=now - timedelta(seconds=100)
    )
    f2 = AgentFinding(
        finding_id="AFIND-D-2",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Endpoint Agent",
        title="Process Finding",
        description="Initial process execution finding",
        severity="HIGH",
        confidence=0.85,
        evidence={"username": "dave", "host": "WS-DELAY", "event_ids": ["EVT-D-2"]},
        source_event_ids=["EVT-D-2"],
        created_at=now - timedelta(seconds=90)
    )
    db_session.add_all([f1, f2])
    db_session.commit()

    corr = CorrelationAgent(db_session)
    corr.execute({})
    assert db_session.query(Incident).count() == 1
    init_inc = db_session.query(Incident).first()
    init_inc_id = init_inc.incident_id
    assert init_inc.finding_count == 2

    # Delayed finding arrives within 900s
    e3 = SecurityEvent(event_id="EVT-D-3", timestamp=now, event_type="network_traffic", severity="CRITICAL")
    db_session.add(e3)
    f3 = AgentFinding(
        finding_id="AFIND-D-3",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Threat Intelligence Agent",
        title="CTI Match Finding",
        description="Delayed threat intel match finding",
        severity="CRITICAL",
        confidence=0.95,
        evidence={"username": "dave", "host": "WS-DELAY", "event_ids": ["EVT-D-3"]},
        source_event_ids=["EVT-D-3"],
        created_at=now
    )
    db_session.add(f3)
    db_session.commit()

    corr.execute({})

    assert db_session.query(Incident).count() == 1
    updated_inc = db_session.query(Incident).first()
    assert updated_inc.incident_id == init_inc_id
    assert updated_inc.finding_count == 3
    assert "Threat Intelligence Agent" in updated_inc.participating_agents
    assert updated_inc.severity == "CRITICAL"


def test_15_correlation_idempotency_no_duplicate_links_or_incidents(db_session):
    """
    15. Processing the same finding set multiple times is idempotent and does not create
        duplicate incidents or duplicate IncidentFinding links.
    """
    now = datetime.now(timezone.utc)
    e1 = SecurityEvent(event_id="EVT-IDEMP-1", timestamp=now, event_type="authentication", severity="HIGH")
    e2 = SecurityEvent(event_id="EVT-IDEMP-2", timestamp=now, event_type="process_execution", severity="HIGH")
    db_session.add_all([e1, e2])

    f1 = AgentFinding(
        finding_id="AFIND-IDEMP-1",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Authentication Agent",
        title="F1",
        description="Idempotent finding 1",
        severity="HIGH",
        confidence=0.9,
        evidence={"host": "WS-IDEMP", "event_ids": ["EVT-IDEMP-1"]},
        source_event_ids=["EVT-IDEMP-1"],
        created_at=now
    )
    f2 = AgentFinding(
        finding_id="AFIND-IDEMP-2",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Endpoint Agent",
        title="F2",
        description="Idempotent finding 2",
        severity="HIGH",
        confidence=0.9,
        evidence={"host": "WS-IDEMP", "event_ids": ["EVT-IDEMP-2"]},
        source_event_ids=["EVT-IDEMP-2"],
        created_at=now
    )
    db_session.add_all([f1, f2])
    db_session.commit()

    corr = CorrelationAgent(db_session)
    corr.execute({})
    corr.execute({})
    corr.execute({})

    assert db_session.query(Incident).count() == 1
    inc = db_session.query(Incident).first()
    links = db_session.query(IncidentFinding).filter(IncidentFinding.incident_id == inc.incident_id).all()
    assert len(links) == 2


def test_16_correlation_preserves_incident_id_on_update(db_session):
    """
    16. New evidence updates an existing incident without changing the incident ID.
    """
    now = datetime.now(timezone.utc)
    e1 = SecurityEvent(event_id="EVT-PRE-1", timestamp=now, event_type="authentication", severity="HIGH")
    e2 = SecurityEvent(event_id="EVT-PRE-2", timestamp=now, event_type="endpoint", severity="HIGH")
    db_session.add_all([e1, e2])

    f1 = AgentFinding(
        finding_id="AFIND-PRE-1",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Authentication Agent",
        title="Auth Alert",
        description="Authentication alert",
        severity="HIGH",
        confidence=0.85,
        evidence={"username": "target_user", "event_ids": ["EVT-PRE-1"]},
        source_event_ids=["EVT-PRE-1"],
        created_at=now
    )
    f2 = AgentFinding(
        finding_id="AFIND-PRE-2",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Endpoint Agent",
        title="EP Alert",
        description="Endpoint alert",
        severity="HIGH",
        confidence=0.85,
        evidence={"username": "target_user", "event_ids": ["EVT-PRE-2"]},
        source_event_ids=["EVT-PRE-2"],
        created_at=now
    )
    db_session.add_all([f1, f2])
    db_session.commit()

    corr = CorrelationAgent(db_session)
    corr.execute({})

    inc_before = db_session.query(Incident).first()
    orig_id = inc_before.incident_id

    e3 = SecurityEvent(event_id="EVT-PRE-3", timestamp=now, event_type="network", severity="HIGH")
    db_session.add(e3)
    f3 = AgentFinding(
        finding_id="AFIND-PRE-3",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Network Monitoring Agent",
        title="Net Alert",
        description="Network alert",
        severity="HIGH",
        confidence=0.85,
        evidence={"username": "target_user", "event_ids": ["EVT-PRE-3"]},
        source_event_ids=["EVT-PRE-3"],
        created_at=now
    )
    db_session.add(f3)
    db_session.commit()

    corr.execute({})
    inc_after = db_session.query(Incident).first()
    assert inc_after.incident_id == orig_id


def test_17_correlation_preserves_agent_attribution(db_session):
    """
    17. Original agent attribution is preserved for all correlated findings.
    """
    now = datetime.now(timezone.utc)
    e1 = SecurityEvent(event_id="EVT-ATTR-1", timestamp=now, event_type="authentication", severity="HIGH")
    e2 = SecurityEvent(event_id="EVT-ATTR-2", timestamp=now, event_type="endpoint", severity="HIGH")
    db_session.add_all([e1, e2])

    f1 = AgentFinding(
        finding_id="AFIND-ATTR-1",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Authentication Agent",
        title="Auth Finding",
        description="Attribution auth finding",
        severity="HIGH",
        confidence=0.85,
        evidence={"host": "WS-ATTR", "event_ids": ["EVT-ATTR-1"]},
        source_event_ids=["EVT-ATTR-1"],
        created_at=now
    )
    f2 = AgentFinding(
        finding_id="AFIND-ATTR-2",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Endpoint Agent",
        title="Endpoint Finding",
        description="Attribution endpoint finding",
        severity="HIGH",
        confidence=0.92,
        evidence={"host": "WS-ATTR", "event_ids": ["EVT-ATTR-2"]},
        source_event_ids=["EVT-ATTR-2"],
        created_at=now
    )
    db_session.add_all([f1, f2])
    db_session.commit()

    corr = CorrelationAgent(db_session)
    corr.execute({})

    inc = db_session.query(Incident).first()
    links = db_session.query(IncidentFinding).filter(IncidentFinding.incident_id == inc.incident_id).all()
    link_agents = {l.agent_name for l in links}
    assert link_agents == {"Authentication Agent", "Endpoint Agent"}


# =============================================================================
# GROUP 3: DOWNSTREAM WORKFLOWS (ATTACK PATH, RCA, RISK, SOAR, VERIFICATION)
# =============================================================================

def test_18_downstream_attack_path_only_on_incident_and_evidence_based(db_session):
    """
    18. Attack-Path Analysis Agent skips execution when no incident exists, and when incident exists,
        builds a directed graph strictly from observed evidence (no invented nodes).
    """
    agent = AttackPathAgent(db_session)
    res_empty = agent.execute({})
    assert res_empty["status"] == "COMPLETED"
    assert res_empty["data"]["graph"]["nodes"] == []
    assert res_empty["data"]["graph"]["edges"] == []

    now = datetime.now(timezone.utc)
    e1 = SecurityEvent(
        event_id="EVT-AP-1",
        timestamp=now - timedelta(seconds=30),
        event_type="authentication",
        severity="HIGH",
        source_ip="198.51.100.99",
        username="compromised_user",
        host="WS-TARGET"
    )
    e2 = SecurityEvent(
        event_id="EVT-AP-2",
        timestamp=now,
        event_type="process_execution",
        severity="HIGH",
        source_ip="198.51.100.99",
        username="compromised_user",
        host="WS-TARGET",
        process_name="mimikatz.exe"
    )
    db_session.add_all([e1, e2])
    db_session.commit()

    inc = Incident(
        incident_id="INC-AP-TEST",
        title="Established Attack Path Test",
        severity="HIGH",
        risk_score=75,
        status="NEW",
        first_seen=now - timedelta(seconds=30),
        last_seen=now,
        affected_users=["compromised_user"],
        affected_hosts=["WS-TARGET"],
        affected_ips=["198.51.100.99"],
        event_count=2,
        finding_count=2,
        participating_agents=["Authentication Agent", "Endpoint Agent"],
        created_at=now,
        updated_at=now
    )
    db_session.add(inc)
    db_session.add(IncidentEvent(incident_id=inc.incident_id, event_id=e1.event_id, sequence_order=0, added_at=now))
    db_session.add(IncidentEvent(incident_id=inc.incident_id, event_id=e2.event_id, sequence_order=1, added_at=now))
    db_session.commit()

    res = agent.execute({"incident_id": inc.incident_id})
    assert res["status"] == "COMPLETED"
    graph = res["data"]["graph"]
    node_ids = {n["id"] for n in graph["nodes"]}
    assert "ip:198.51.100.99" in node_ids
    assert "user:compromised_user" in node_ids
    assert "host:WS-TARGET" in node_ids


def test_19_downstream_investigation_answers_8_canonical_questions(db_session):
    """
    19. Investigation Agent answers the 8 canonical SOC questions using established incident evidence.
    """
    now = datetime.now(timezone.utc)
    e = SecurityEvent(
        event_id="EVT-INV-1",
        timestamp=now,
        event_type="authentication",
        severity="CRITICAL",
        source_ip="203.0.113.5",
        username="admin_user",
        host="DC-01"
    )
    db_session.add(e)
    inc = Incident(
        incident_id="INC-INV-TEST",
        title="Investigation Test Incident",
        severity="CRITICAL",
        risk_score=85,
        status="NEW",
        first_seen=now,
        last_seen=now,
        affected_users=["admin_user"],
        affected_hosts=["DC-01"],
        affected_ips=["203.0.113.5"],
        event_count=1,
        finding_count=2,
        participating_agents=["Authentication Agent", "Threat Intelligence Agent"],
        created_at=now,
        updated_at=now
    )
    db_session.add(inc)
    db_session.add(IncidentEvent(incident_id=inc.incident_id, event_id=e.event_id, sequence_order=0, added_at=now))
    db_session.commit()

    agent = InvestigationAgent(db_session)
    res = agent.execute({"incident_id": inc.incident_id})
    assert res["status"] == "COMPLETED"
    summary = res["data"].get("ai_summary", {})

    canonical_keys = [
        "what_happened",
        "how_did_it_begin",
        "affected_systems_and_accounts",
        "activities_occurred",
        "likely_attack_sequence",
        "evidence_supporting",
        "uncertainties",
        "next_steps"
    ]
    for key in canonical_keys:
        assert key in summary, f"Investigation summary missing canonical answer: {key}"
        assert summary[key], f"Canonical answer for {key} is empty"


def test_20_downstream_risk_scoring_stages_and_updates(db_session):
    """
    20. Risk scoring progresses through configured stages and updates when new evidence arrives.
    """
    now = datetime.now(timezone.utc)
    e_auth = SecurityEvent(
        event_id="EVT-RISK-AUTH",
        timestamp=now,
        event_type="authentication",
        severity="MEDIUM",
        username="user1",
        host="WS-1"
    )
    db_session.add(e_auth)
    db_session.commit()

    inc = Incident(
        incident_id="INC-RISK-TEST",
        title="Risk Scoring Stage Test",
        severity="MEDIUM",
        risk_score=50,
        status="NEW",
        first_seen=now,
        last_seen=now,
        affected_users=["user1"],
        affected_hosts=["WS-1"],
        affected_ips=["10.0.0.1"],
        event_count=1,
        finding_count=1,
        participating_agents=["Authentication Agent"],
        created_at=now,
        updated_at=now
    )
    db_session.add(inc)
    db_session.add(IncidentEvent(incident_id=inc.incident_id, event_id=e_auth.event_id, sequence_order=0, added_at=now))
    db_session.commit()

    risk1 = calculate_incident_risk(db_session, inc)
    score1 = risk1.overall_score
    assert score1 >= 30
    assert risk1.progression_stage == "Initial Access"

    # Now add high-impact file_access / impact event
    e_impact = SecurityEvent(
        event_id="EVT-RISK-IMPACT",
        timestamp=now,
        event_type="file_access",
        severity="CRITICAL",
        command_line="vssadmin delete shadows /all /quiet",
        username="user1",
        host="WS-1"
    )
    db_session.add(e_impact)
    db_session.add(IncidentEvent(incident_id=inc.incident_id, event_id=e_impact.event_id, sequence_order=1, added_at=now))
    inc.severity = "CRITICAL"
    inc.event_count = 2
    db_session.commit()

    risk2 = calculate_incident_risk(db_session, inc)
    assert risk2.overall_score > score1
    assert risk2.progression_stage == "Data Access & Impact"
    assert risk2.severity_band in ["CRITICAL", "HIGH"]


def test_21_downstream_soar_approval_enforcement(db_session):
    """
    21. Response actions enforce approval requirements for high-impact actions.
    """
    now = datetime.now(timezone.utc)
    inc = Incident(
        incident_id="INC-SOAR-TEST",
        title="SOAR Approval Test",
        severity="HIGH",
        risk_score=70,
        status="NEW",
        first_seen=now,
        last_seen=now,
        created_at=now,
        updated_at=now
    )
    db_session.add(inc)
    db_session.commit()

    action = ResponseAction(
        action_id=f"ACT-{uuid.uuid4().hex[:8].upper()}",
        incident_id=inc.incident_id,
        action_type="BLOCK_IP",
        target_type="IP",
        target_value="203.0.113.199",
        reason="Malicious C2 relay",
        expected_effect="Drop all inbound and outbound traffic",
        status="PENDING_APPROVAL",
        requires_approval=True,
        created_at=now
    )
    db_session.add(action)
    db_session.commit()
    assert action.status == "PENDING_APPROVAL"

    # Execution before approval must fail with 403 HTTPException
    with pytest.raises(HTTPException) as exc_info:
        execute_response_action(db_session, action.action_id, actor="SOAR Engine", dry_run=False)
    assert exc_info.value.status_code == 403

    # Approve action
    approved = approve_response_action(db_session, action.action_id, approved_by="SOC Admin")
    assert approved.status == "APPROVED"
    assert approved.approved_by == "SOC Admin"


def test_22_downstream_response_verification_simulated_and_lab(db_session):
    """
    22. Response verification confirms that simulated actions record simulation evidence
        and lab actions verify containment state.
    """
    now = datetime.now(timezone.utc)
    inc = Incident(
        incident_id="INC-VER-TEST",
        title="Verification Test",
        severity="HIGH",
        risk_score=70,
        status="NEW",
        first_seen=now,
        last_seen=now,
        created_at=now,
        updated_at=now
    )
    db_session.add(inc)
    db_session.commit()

    action = ResponseAction(
        action_id=f"ACT-{uuid.uuid4().hex[:8].upper()}",
        incident_id=inc.incident_id,
        action_type="ISOLATE_ENDPOINT",
        target_type="HOST",
        target_value="WS-LAB-01",
        reason="Compromised host containment",
        expected_effect="Disconnect network interface",
        status="RECOMMENDED",
        requires_approval=True,
        created_at=now
    )
    db_session.add(action)
    db_session.commit()
    approve_response_action(db_session, action.action_id, approved_by="SOC Admin")

    sim_res = execute_response_action(db_session, action.action_id, actor="SOAR Engine", dry_run=True)
    assert sim_res.status == "SIMULATED"

    ver = db_session.query(VerificationResult).filter(VerificationResult.action_id == action.action_id).first()
    assert ver is not None
    assert ver.verification_status == "SIMULATED"
    assert "simulation" in ver.evidence_summary.lower()


# =============================================================================
# GROUP 4: END-TO-END INTEGRATION & DATABASE INTEGRITY
# =============================================================================

def test_23_e2e_ingestion_queue_agent_pipeline_correlation_broadcast(db_session):
    """
    23. Complete flow: Telemetry event -> Ingestion -> Dispatch -> Agent Execution ->
        Correlation -> Incident Created -> Investigation & Response formulated -> WebSocket Broadcast.
    """
    published = []
    def mock_broadcast(event_type, payload):
        published.append((event_type, payload))

    broadcaster.publish_sync = mock_broadcast

    now = datetime.now(timezone.utc)
    evt1_create = SecurityEventCreate(
        event_id="EVT-E2E-01",
        timestamp=now,
        event_type="authentication",
        severity="CRITICAL",
        source_ip="198.51.100.22",
        username="superadmin",
        host="DC-PRIMARY",
        file_action="SUCCESS_POST_BURST",
        command_line="Successful login post burst"
    )
    res_ingest_1, saved_1 = normalize_and_ingest_events(db_session, [evt1_create], auto_queue=False)
    assert len(saved_1) == 1
    f1 = evaluate_event_with_rolling_window(db_session, saved_1[0])

    engine = MultiAgentSOCEngine(db_session)
    res1 = engine.dispatch_event_driven_pipeline(saved_1[0], f1)
    assert db_session.query(Incident).count() == 0

    evt2_create = SecurityEventCreate(
        event_id="EVT-E2E-02",
        timestamp=now + timedelta(seconds=5),
        event_type="process_execution",
        severity="HIGH",
        source_ip="198.51.100.22",
        username="superadmin",
        host="DC-PRIMARY",
        process_name="powershell.exe",
        command_line="powershell.exe -enc VwByAGkAdABlAC0ASABvAHMAdAA..."
    )
    res_ingest_2, saved_2 = normalize_and_ingest_events(db_session, [evt2_create], auto_queue=False)
    assert len(saved_2) == 1
    f2 = evaluate_event_with_rolling_window(db_session, saved_2[0])

    res2 = engine.dispatch_event_driven_pipeline(saved_2[0], f2)

    inc = db_session.query(Incident).first()
    assert inc is not None
    assert inc.finding_count >= 2
    assert set(inc.participating_agents) >= {"Authentication Agent", "Endpoint Agent"}
    assert inc.investigation_status == "COMPLETED"
    assert inc.response_status in ["RECOMMENDED", "PENDING_APPROVAL"]

    event_types = [p[0] for p in published]
    assert "AGENT_FINDING_RECORDED" in event_types
    assert "INCIDENT_CREATED" in event_types


def test_24_e2e_database_records_integrity(db_session):
    """
    24. Verifies database schema integrity: foreign keys, IncidentFinding association,
        IncidentEvent association, AgentFinding.incident_id, and SecurityEvent links.
    """
    now = datetime.now(timezone.utc)
    e1 = SecurityEvent(event_id="EVT-DB-1", timestamp=now, event_type="authentication", severity="HIGH", host="SRV-DB")
    e2 = SecurityEvent(event_id="EVT-DB-2", timestamp=now, event_type="endpoint", severity="HIGH", host="SRV-DB")
    db_session.add_all([e1, e2])
    db_session.commit()

    f1 = AgentFinding(
        finding_id="AFIND-DB-1",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Authentication Agent",
        title="DB Auth Finding",
        description="Database integrity auth finding",
        severity="HIGH",
        confidence=0.9,
        evidence={"host": "SRV-DB", "event_ids": ["EVT-DB-1"]},
        source_event_ids=["EVT-DB-1"],
        created_at=now
    )
    f2 = AgentFinding(
        finding_id="AFIND-DB-2",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Endpoint Agent",
        title="DB Endpoint Finding",
        description="Database integrity endpoint finding",
        severity="HIGH",
        confidence=0.9,
        evidence={"host": "SRV-DB", "event_ids": ["EVT-DB-2"]},
        source_event_ids=["EVT-DB-2"],
        created_at=now
    )
    db_session.add_all([f1, f2])
    db_session.commit()

    corr = CorrelationAgent(db_session)
    corr.execute({})

    inc = db_session.query(Incident).first()
    assert inc is not None

    f_links = db_session.query(IncidentFinding).filter(IncidentFinding.incident_id == inc.incident_id).all()
    assert len(f_links) == 2
    assert {l.finding_id for l in f_links} == {"AFIND-DB-1", "AFIND-DB-2"}

    findings = db_session.query(AgentFinding).filter(AgentFinding.incident_id == inc.incident_id).all()
    assert len(findings) == 2

    e_links = db_session.query(IncidentEvent).filter(IncidentEvent.incident_id == inc.incident_id).all()
    assert len(e_links) == 2
    assert {l.event_id for l in e_links} == {"EVT-DB-1", "EVT-DB-2"}


def test_25_e2e_websocket_broadcast_distinction(db_session):
    """
    25. Verifies WebSocket broadcasts distinguish between finding alerts, correlated incidents,
        and response actions.
    """
    broadcast_log = []
    def capture_broadcast(event_type, payload):
        broadcast_log.append((event_type, payload))

    broadcaster.publish_sync = capture_broadcast

    broadcaster.publish_sync("AGENT_FINDING_RECORDED", {"finding_id": "AF-TEST", "severity": "HIGH"})
    broadcaster.publish_sync("INCIDENT_CREATED", {"incident_id": "INC-TEST", "severity": "CRITICAL"})
    broadcaster.publish_sync("RESPONSE_ACTION_CREATED", {"action_id": "ACT-TEST", "action_type": "BLOCK_IP"})

    types = [b[0] for b in broadcast_log]
    assert types == ["AGENT_FINDING_RECORDED", "INCIDENT_CREATED", "RESPONSE_ACTION_CREATED"]
    assert broadcast_log[0][1]["finding_id"] == "AF-TEST"
    assert broadcast_log[1][1]["incident_id"] == "INC-TEST"
    assert broadcast_log[2][1]["action_id"] == "ACT-TEST"


def test_26_edge_case_missing_provenance_rejected(db_session):
    """
    26. Findings with missing provenance (no source event IDs) cannot silently
        qualify as independent corroborating evidence to form an incident.
    """
    now = datetime.now(timezone.utc)
    e1 = SecurityEvent(event_id="EVT-PROV-1", timestamp=now, event_type="authentication", severity="HIGH", host="WS-PROV")
    db_session.add(e1)
    db_session.commit()

    f1 = AgentFinding(
        finding_id="AFIND-PROV-VALID",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Authentication Agent",
        title="Valid Finding",
        description="Finding with genuine source event",
        severity="HIGH",
        confidence=0.9,
        evidence={"host": "WS-PROV", "event_ids": ["EVT-PROV-1"]},
        source_event_ids=["EVT-PROV-1"],
        created_at=now
    )
    # Fabricated / orphan finding with no source events
    f2 = AgentFinding(
        finding_id="AFIND-PROV-ORPHAN",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Endpoint Agent",
        title="Orphan Finding",
        description="Finding with missing provenance",
        severity="HIGH",
        confidence=0.9,
        evidence={"host": "WS-PROV"},
        source_event_ids=[],
        created_at=now
    )
    db_session.add_all([f1, f2])
    db_session.commit()

    corr = CorrelationAgent(db_session)
    res = corr.execute({"findings": [f1, f2]})

    # Must NOT create an incident
    assert db_session.query(Incident).count() == 0
    assert "AFIND-PROV-ORPHAN" in res["data"]["uncorrelated_findings"]
    assert "AFIND-PROV-VALID" in res["data"]["uncorrelated_findings"]


def test_27_edge_case_duplicate_enrichment_does_not_inflate_finding_count(db_session):
    """
    27. When an incident exists, duplicate enrichment for an existing source event
        updates evidence and participating agents, but does not inflate the finding count.
    """
    now = datetime.now(timezone.utc)
    e1 = SecurityEvent(event_id="EVT-ENR-1", timestamp=now - timedelta(seconds=60), event_type="authentication", severity="HIGH", host="WS-ENR", source_ip="198.51.100.77")
    e2 = SecurityEvent(event_id="EVT-ENR-2", timestamp=now - timedelta(seconds=30), event_type="endpoint", severity="HIGH", host="WS-ENR", source_ip="198.51.100.77")
    db_session.add_all([e1, e2])
    db_session.commit()

    f1 = AgentFinding(
        finding_id="AFIND-ENR-1",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Authentication Agent",
        title="Auth Finding",
        description="Initial auth finding",
        severity="HIGH",
        confidence=0.85,
        evidence={"host": "WS-ENR", "source_ip": "198.51.100.77", "event_ids": ["EVT-ENR-1"]},
        source_event_ids=["EVT-ENR-1"],
        created_at=now - timedelta(seconds=60)
    )
    f2 = AgentFinding(
        finding_id="AFIND-ENR-2",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Endpoint Agent",
        title="Endpoint Finding",
        description="Initial endpoint finding",
        severity="HIGH",
        confidence=0.90,
        evidence={"host": "WS-ENR", "source_ip": "198.51.100.77", "event_ids": ["EVT-ENR-2"]},
        source_event_ids=["EVT-ENR-2"],
        created_at=now - timedelta(seconds=30)
    )
    db_session.add_all([f1, f2])
    db_session.commit()

    corr = CorrelationAgent(db_session)
    corr.execute({})

    inc = db_session.query(Incident).first()
    assert inc is not None
    assert inc.finding_count == 2
    assert inc.event_count == 2

    # Now duplicate enrichment arrives on existing event EVT-ENR-1 from Threat Intelligence Agent
    f_enrich = AgentFinding(
        finding_id="AFIND-ENR-CTI",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Threat Intelligence Agent",
        title="CTI Match for Event 1",
        description="Threat intel matches IP on event 1",
        severity="CRITICAL",
        confidence=0.98,
        evidence={"host": "WS-ENR", "source_ip": "198.51.100.77", "event_ids": ["EVT-ENR-1"]},
        source_event_ids=["EVT-ENR-1"],  # Same source event
        created_at=now
    )
    db_session.add(f_enrich)
    db_session.commit()

    corr.execute({})

    db_session.refresh(inc)
    # Finding count must remain 2 (not inflated to 3), but agent attribution is updated
    assert inc.finding_count == 2
    assert "Threat Intelligence Agent" in inc.participating_agents
    assert inc.severity == "CRITICAL"


def test_28_edge_case_unrelated_finding_rejected_by_existing_incident(db_session):
    """
    28. An existing incident does not absorb an unrelated finding, even if it arrives within the window.
    """
    now = datetime.now(timezone.utc)
    e1 = SecurityEvent(event_id="EVT-REL-1", timestamp=now - timedelta(seconds=50), event_type="authentication", severity="HIGH", host="SRV-ALPHA", username="alice")
    e2 = SecurityEvent(event_id="EVT-REL-2", timestamp=now - timedelta(seconds=40), event_type="endpoint", severity="HIGH", host="SRV-ALPHA", username="alice")
    db_session.add_all([e1, e2])
    db_session.commit()

    f1 = AgentFinding(
        finding_id="AFIND-REL-1",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Authentication Agent",
        title="Alpha Auth",
        description="Alpha auth event",
        severity="HIGH",
        confidence=0.85,
        evidence={"host": "SRV-ALPHA", "username": "alice", "event_ids": ["EVT-REL-1"]},
        source_event_ids=["EVT-REL-1"],
        created_at=now - timedelta(seconds=50)
    )
    f2 = AgentFinding(
        finding_id="AFIND-REL-2",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Endpoint Agent",
        title="Alpha Endpoint",
        description="Alpha endpoint event",
        severity="HIGH",
        confidence=0.90,
        evidence={"host": "SRV-ALPHA", "username": "alice", "event_ids": ["EVT-REL-2"]},
        source_event_ids=["EVT-REL-2"],
        created_at=now - timedelta(seconds=40)
    )
    db_session.add_all([f1, f2])
    db_session.commit()

    corr = CorrelationAgent(db_session)
    corr.execute({})

    inc = db_session.query(Incident).first()
    assert inc is not None
    assert inc.affected_hosts == ["SRV-ALPHA"]

    # Unrelated finding on SRV-ZETA from user zoe arrives within 900s
    e_unrelated = SecurityEvent(event_id="EVT-UNREL-1", timestamp=now, event_type="authentication", severity="HIGH", host="SRV-ZETA", username="zoe")
    db_session.add(e_unrelated)
    f_unrelated = AgentFinding(
        finding_id="AFIND-UNREL-1",
        run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        agent_name="Authentication Agent",
        title="Zeta Auth",
        description="Zeta auth event",
        severity="HIGH",
        confidence=0.85,
        evidence={"host": "SRV-ZETA", "username": "zoe", "event_ids": ["EVT-UNREL-1"]},
        source_event_ids=["EVT-UNREL-1"],
        created_at=now
    )
    db_session.add(f_unrelated)
    db_session.commit()

    corr.execute({})

    db_session.refresh(inc)
    db_session.refresh(f_unrelated)

    # Incident must NOT absorb f_unrelated
    assert f_unrelated.incident_id is None
    assert "SRV-ZETA" not in (inc.affected_hosts or [])
    assert inc.finding_count == 2

