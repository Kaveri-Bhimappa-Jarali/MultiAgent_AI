import pytest
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.user import User
from app.models.event import SecurityEvent
from app.models.incident import Incident
from app.schemas.event import SecurityEventCreate
from app.services.auth_service import seed_default_users, verify_password, create_access_token
from app.services.detection_service import seed_detection_rules, evaluate_events_against_rules
from app.services.threat_intel_service import seed_threat_intelligence, lookup_indicator
from app.services.ingestion_service import normalize_and_ingest_events
from app.services.anomaly_model import anomaly_engine
from app.agents.orchestrator import MultiAgentSOCEngine
from app.services.risk_service import calculate_incident_risk
from app.services.response_service import approve_response_action, execute_response_action
from app.services.verification_service import create_and_run_verification
from app.services.report_service import generate_incident_pdf, generate_soc_summary_pdf
from app.services.demo_service import run_scenario_1_brute_force, reset_demo_lab

@pytest.fixture(scope="module")
def db_session():
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=test_engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSession()
    
    seed_default_users(session)
    seed_detection_rules(session)
    seed_threat_intelligence(session)
    
    yield session
    session.close()

def test_auth_and_seed_users(db_session):
    admin = db_session.query(User).filter(User.username == "admin").first()
    assert admin is not None
    assert admin.role == "SOC Admin"
    assert verify_password("Admin@SOC2026!", admin.hashed_password) is True
    
    token = create_access_token({"sub": admin.username, "role": admin.role})
    assert isinstance(token, str) and len(token) > 20

def test_threat_intelligence_lookup(db_session):
    res = lookup_indicator(db_session, "198.51.100.23")
    assert res.found is True
    assert res.risk_level == "MALICIOUS"
    assert "Cobalt Strike" in res.threat_details.threat_name

def test_anomaly_detection_model(db_session):
    normal_evt = SecurityEventCreate(
        event_type="network_connection",
        source_ip="10.0.0.5",
        destination_port=443,
        severity="INFO"
    )
    is_anom, score, ind = anomaly_engine.score_event(normal_evt)
    assert score >= 0.0

    abnormal_evt = SecurityEventCreate(
        event_type="process_execution",
        command_line="powershell.exe -enc " + "A"*200 + " delete shadows",
        destination_port=55555,
        severity="CRITICAL"
    )
    is_anom2, score2, ind2 = anomaly_engine.score_event(abnormal_evt)
    assert score2 > score
    assert len(ind2) > 0

def test_multi_agent_pipeline_and_correlation(db_session):
    events = [
        SecurityEventCreate(
            event_id="EVT-TEST-01",
            event_type="authentication",
            severity="MEDIUM",
            source_ip="203.0.113.5",
            username="test_user",
            host="WS-01",
            file_action="FAILED",
            command_line="Failed password attempt"
        ),
        SecurityEventCreate(
            event_id="EVT-TEST-02",
            event_type="authentication",
            severity="HIGH",
            source_ip="203.0.113.5",
            username="test_user",
            host="WS-01",
            file_action="FAILED",
            command_line="Failed password attempt"
        ),
        SecurityEventCreate(
            event_id="EVT-TEST-03",
            event_type="authentication",
            severity="CRITICAL",
            source_ip="203.0.113.5",
            username="test_user",
            host="WS-01",
            file_action="SUCCESS_POST_BURST",
            command_line="Successful login post burst"
        ),
        SecurityEventCreate(
            event_id="EVT-TEST-04",
            event_type="privilege_escalation",
            severity="CRITICAL",
            source_ip="203.0.113.5",
            username="test_user",
            host="WS-01",
            command_line="sudo -u root bash -i"
        )
    ]
    ingest_res, saved_events = normalize_and_ingest_events(db_session, events)
    assert ingest_res.accepted == 4

    engine = MultiAgentSOCEngine(db_session)
    orch_res = engine.run_pipeline(events=saved_events)
    assert orch_res["pipeline_status"] == "COMPLETED"
    assert orch_res["agents_executed"] == 10

    # Verify incident was created
    inc = db_session.query(Incident).order_by(Incident.created_at.desc()).first()
    assert inc is not None
    assert "test_user" in inc.affected_users
    assert inc.severity in ["HIGH", "CRITICAL"]

    # Verify risk assessment
    risk = calculate_incident_risk(db_session, inc)
    assert risk.overall_score >= 70

def test_response_workflow_and_verification(db_session):
    inc = db_session.query(Incident).first()
    assert inc is not None

    from app.models.response import ResponseAction
    action = db_session.query(ResponseAction).filter(ResponseAction.incident_id == inc.incident_id).first()
    if action:
        approved = approve_response_action(db_session, action.action_id, approved_by="Test Analyst")
        assert approved.status == "APPROVED"

        executed = execute_response_action(db_session, action.action_id, actor="Test Operator", dry_run=True)
        assert executed.status == "EXECUTED"

        ver = create_and_run_verification(db_session, action.action_id, inc.incident_id)
        assert ver is not None
        assert ver.verification_status in ["VERIFIED_CONTAINED", "PENDING_VERIFICATION", "SIMULATED_RESPONSE_VERIFIED", "ACTUAL_LAB_RESPONSE_VERIFIED"]

def test_report_generation(db_session):
    inc = db_session.query(Incident).first()
    if inc:
        pdf_buf = generate_incident_pdf(db_session, inc.incident_id)
        assert pdf_buf.getvalue().startswith(b"%PDF")
    
    soc_buf = generate_soc_summary_pdf(db_session)
    assert soc_buf.getvalue().startswith(b"%PDF")
