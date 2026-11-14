"""
Independent Code-Level Verification of Multi-Agent AI SOC
Directly tests against an isolated SQLite database using actual ORM models and services.
Verifies Cases A through H, Downstream Pipeline, Agent Diversity, and Database Relationships.
"""

import os
import sys
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.database import Base
from app.models.event import SecurityEvent
from app.models.agent import AgentFinding
from app.models.incident import Incident, IncidentEvent, IncidentFinding, IncidentAudit
from app.models.detection import DetectionFinding, DetectionRule
from app.models.response import ResponseAction, VerificationResult
from app.models.threat_intel import ThreatIndicator
from app.services.database_migrations import ensure_schema_migrations
from app.services.time_utils import ensure_utc

from app.agents.network_agent import NetworkMonitoringAgent
from app.agents.auth_agent import AuthenticationAgent
from app.agents.endpoint_agent import EndpointAgent
from app.agents.malicious_behaviour_agent import MaliciousBehaviourAgent
from app.agents.anomaly_detection_agent import AnomalyDetectionAgent
from app.agents.threat_intel_agent import ThreatIntelligenceAgent
from app.agents.correlation_agent import CorrelationAgent
from app.agents.attack_path_agent import AttackPathAgent
from app.agents.investigation_agent import InvestigationAgent
from app.agents.response_agent import ResponseAgent
from app.agents.orchestrator import MultiAgentSOCEngine
from app.services.risk_service import calculate_incident_risk
from app.services.response_service import approve_response_action, execute_response_action
from app.services.broadcaster import broadcaster

# Setup isolated verification DB
TEST_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "independent_audit.db"))
if os.path.exists(TEST_DB_PATH):
    try:
        os.remove(TEST_DB_PATH)
    except Exception:
        pass

engine = create_engine(f"sqlite:///{TEST_DB_PATH}", echo=False)
Base.metadata.create_all(bind=engine)
ensure_schema_migrations(engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

captured_ws_messages = []
def capture_ws(event_type, payload):
    captured_ws_messages.append((event_type, payload))

broadcaster.publish_sync = capture_ws

results_matrix = {}

def log_header(title):
    print("\n" + "=" * 80)
    print(f" {title}")
    print("=" * 80)

def verify_case(case_name, condition, details=""):
    status = "PASS" if condition else "FAIL"
    results_matrix[case_name] = status
    print(f"[{status}] {case_name}: {details}")

# =============================================================================
# SCENARIO A: One raw event and one finding: NO correlated incident
# =============================================================================
log_header("SCENARIO A: One raw event & one finding -> NO correlated incident")
db = SessionLocal()
now = datetime.now(timezone.utc)

e_a = SecurityEvent(
    event_id="EVT-SCEN-A",
    timestamp=now,
    event_type="authentication",
    severity="HIGH",
    source_ip="198.51.100.11",
    username="alice",
    host="WS-ALPHA"
)
db.add(e_a)
db.commit()

f_a = AgentFinding(
    finding_id="AF-SCEN-A",
    run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
    agent_name="Authentication Agent",
    title="Single Failed Auth Finding",
    description="Single authentication failure observed",
    severity="HIGH",
    confidence=0.88,
    evidence={"username": "alice", "source_ip": "198.51.100.11", "host": "WS-ALPHA", "event_ids": ["EVT-SCEN-A"]},
    source_event_ids=["EVT-SCEN-A"],
    created_at=now
)
db.add(f_a)
db.commit()

corr_a = CorrelationAgent(db)
res_a = corr_a.execute({})

inc_count_a = db.query(Incident).count()
db.refresh(f_a)

print(f"DB Incidents Count: {inc_count_a}")
print(f"Finding AF-SCEN-A incident_id in DB: {f_a.incident_id}")
print(f"Uncorrelated Findings from Agent: {res_a['data']['uncorrelated_findings']}")

verify_case(
    "Case A: Single Raw Event & Single Finding",
    inc_count_a == 0 and f_a.incident_id is None and "AF-SCEN-A" in res_a['data']['uncorrelated_findings'],
    "No incident created in DB; finding remains uncorrelated (incident_id = NULL)"
)
db.close()


# =============================================================================
# SCENARIO B: Multiple raw failed logins aggregated into ONE brute-force finding:
#             NO incident solely because of raw event count
# =============================================================================
log_header("SCENARIO B: Multi-event burst aggregated into 1 finding -> NO incident")
db = SessionLocal()
now = datetime.now(timezone.utc)

e_b1 = SecurityEvent(event_id="EVT-B-1", timestamp=now - timedelta(seconds=20), event_type="authentication", severity="HIGH", source_ip="203.0.113.88", username="bob", host="DC-BETA", command_line="failed")
e_b2 = SecurityEvent(event_id="EVT-B-2", timestamp=now - timedelta(seconds=15), event_type="authentication", severity="HIGH", source_ip="203.0.113.88", username="bob", host="DC-BETA", command_line="failed")
e_b3 = SecurityEvent(event_id="EVT-B-3", timestamp=now - timedelta(seconds=10), event_type="authentication", severity="HIGH", source_ip="203.0.113.88", username="bob", host="DC-BETA", command_line="failed")
db.add_all([e_b1, e_b2, e_b3])
db.commit()

# Run Authentication Agent
auth_agent_b = AuthenticationAgent(db)
auth_res_b = auth_agent_b.execute({"events": [e_b1, e_b2, e_b3]})
b_findings = db.query(AgentFinding).filter(AgentFinding.agent_name == "Authentication Agent", AgentFinding.source_event_ids.contains("EVT-B-1")).all()

print(f"Authentication Agent generated {len(b_findings)} aggregate finding(s) for 3 raw events.")
f_b = b_findings[0]
print(f"Finding ID: {f_b.finding_id}, Title: {f_b.title}, source_event_ids: {f_b.source_event_ids}")

corr_b = CorrelationAgent(db)
res_b = corr_b.execute({})
inc_count_b = db.query(Incident).count()
db.refresh(f_b)

print(f"DB Incidents Count: {inc_count_b}")
print(f"Finding {f_b.finding_id} incident_id: {f_b.incident_id}")

verify_case(
    "Case B: Multi-Event Brute Force Single Finding",
    len(b_findings) == 1 and inc_count_b == 0 and f_b.incident_id is None,
    "Brute force events aggregated into 1 finding; does not satisfy >= 2 distinct findings threshold; no incident"
)
db.close()


# =============================================================================
# SCENARIO C: Two distinct findings from two distinct source events, sharing an entity
#             within 900s: CREATE ELIGIBLE INCIDENT
# =============================================================================
log_header("SCENARIO C: Two distinct findings from 2 events on same entity (900s) -> CREATE INCIDENT")
db = SessionLocal()
now = datetime.now(timezone.utc)

e_c1 = SecurityEvent(event_id="EVT-C-1", timestamp=now - timedelta(seconds=60), event_type="authentication", severity="HIGH", source_ip="198.51.100.99", username="charlie", host="WS-CORR")
e_c2 = SecurityEvent(event_id="EVT-C-2", timestamp=now - timedelta(seconds=30), event_type="process_execution", severity="HIGH", source_ip="198.51.100.99", username="charlie", host="WS-CORR", command_line="powershell -enc Vw...")
db.add_all([e_c1, e_c2])
db.commit()

f_c1 = AgentFinding(
    finding_id="AF-C-1",
    run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
    agent_name="Authentication Agent",
    title="Failed Logins",
    description="Multiple failures",
    severity="HIGH",
    confidence=0.9,
    evidence={"username": "charlie", "host": "WS-CORR", "event_ids": ["EVT-C-1"]},
    source_event_ids=["EVT-C-1"],
    created_at=now - timedelta(seconds=60)
)
f_c2 = AgentFinding(
    finding_id="AF-C-2",
    run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
    agent_name="Endpoint Agent",
    title="PowerShell Execution",
    description="Suspicious encoded script",
    severity="HIGH",
    confidence=0.92,
    evidence={"username": "charlie", "host": "WS-CORR", "event_ids": ["EVT-C-2"]},
    source_event_ids=["EVT-C-2"],
    created_at=now - timedelta(seconds=30)
)
db.add_all([f_c1, f_c2])
db.commit()

corr_c = CorrelationAgent(db)
res_c = corr_c.execute({})

inc_c = db.query(Incident).first()
inc_f_links_c = db.query(IncidentFinding).filter(IncidentFinding.incident_id == inc_c.incident_id).all() if inc_c else []
db.refresh(f_c1)
db.refresh(f_c2)

print(f"Created Incident ID: {inc_c.incident_id if inc_c else None}")
print(f"Incident Title: {inc_c.title if inc_c else None}")
print(f"Finding Count in Incident: {inc_c.finding_count if inc_c else None}")
print(f"Participating Agents: {inc_c.participating_agents if inc_c else None}")
print(f"Correlation Reasons: {inc_c.correlation_reasons if inc_c else None}")
print(f"IncidentFinding DB links count: {len(inc_f_links_c)}")
print(f"f_c1.incident_id: {f_c1.incident_id}, f_c2.incident_id: {f_c2.incident_id}")

verify_case(
    "Case C: Two Related Findings within 900s",
    inc_c is not None and inc_c.finding_count == 2 and set(inc_c.participating_agents) == {"Authentication Agent", "Endpoint Agent"} and f_c1.incident_id == inc_c.incident_id and f_c2.incident_id == inc_c.incident_id,
    f"Correlated incident {inc_c.incident_id if inc_c else ''} created with 2 linked findings and both participating agents"
)
inc_c_id = inc_c.incident_id if inc_c else None
db.close()


# =============================================================================
# SCENARIO D: Two unrelated findings within 900 seconds: NO INCIDENT
# =============================================================================
log_header("SCENARIO D: Two unrelated findings within 900 seconds -> NO INCIDENT")
db = SessionLocal()
now = datetime.now(timezone.utc)

e_d1 = SecurityEvent(event_id="EVT-D-1", timestamp=now, event_type="authentication", severity="HIGH", source_ip="10.10.1.1", username="user_finance", host="WS-FINANCE-01")
e_d2 = SecurityEvent(event_id="EVT-D-2", timestamp=now, event_type="endpoint", severity="HIGH", source_ip="172.16.5.5", username="user_hr", host="WS-HR-99")
db.add_all([e_d1, e_d2])
db.commit()

f_d1 = AgentFinding(
    finding_id="AF-D-1",
    run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
    agent_name="Authentication Agent",
    title="Finance Dept Finding",
    description="Finance auth failure",
    severity="HIGH",
    confidence=0.85,
    evidence={"source_ip": "10.10.1.1", "username": "user_finance", "host": "WS-FINANCE-01", "event_ids": ["EVT-D-1"]},
    source_event_ids=["EVT-D-1"],
    created_at=now
)
f_d2 = AgentFinding(
    finding_id="AF-D-2",
    run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
    agent_name="Endpoint Agent",
    title="HR Dept Finding",
    description="HR host execution",
    severity="HIGH",
    confidence=0.85,
    evidence={"source_ip": "172.16.5.5", "username": "user_hr", "host": "WS-HR-99", "event_ids": ["EVT-D-2"]},
    source_event_ids=["EVT-D-2"],
    created_at=now
)
db.add_all([f_d1, f_d2])
db.commit()

# Query incident count before correlation of D
inc_count_pre_d = db.query(Incident).count()

corr_d = CorrelationAgent(db)
# Evaluate only findings D1 and D2
res_d = corr_d.execute({"findings": [f_d1, f_d2]})

inc_count_post_d = db.query(Incident).count()
db.refresh(f_d1)
db.refresh(f_d2)

print(f"Incident count before: {inc_count_pre_d}, after: {inc_count_post_d}")
print(f"f_d1 incident_id: {f_d1.incident_id}, f_d2 incident_id: {f_d2.incident_id}")

verify_case(
    "Case D: Unrelated Findings within 900s",
    inc_count_post_d == inc_count_pre_d and f_d1.incident_id is None and f_d2.incident_id is None,
    "No new incident created; unrelated findings remain isolated"
)
db.close()


# =============================================================================
# SCENARIO E: Two related findings OUTSIDE the configured window (> 900s): NO CORRELATION
# =============================================================================
log_header("SCENARIO E: Related findings outside 900s window -> NO CORRELATION")
db = SessionLocal()
now = datetime.now(timezone.utc)
old_time = now - timedelta(seconds=1800)  # 30 minutes ago (> 900s)

e_e1 = SecurityEvent(event_id="EVT-E-1", timestamp=old_time, event_type="authentication", severity="HIGH", host="WS-EXPIRED")
e_e2 = SecurityEvent(event_id="EVT-E-2", timestamp=now, event_type="process_execution", severity="HIGH", host="WS-EXPIRED")
db.add_all([e_e1, e_e2])
db.commit()

f_e1 = AgentFinding(
    finding_id="AF-E-1",
    run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
    agent_name="Authentication Agent",
    title="Old Auth Finding",
    description="Old auth failure",
    severity="HIGH",
    confidence=0.85,
    evidence={"host": "WS-EXPIRED", "event_ids": ["EVT-E-1"]},
    source_event_ids=["EVT-E-1"],
    created_at=old_time
)
f_e2 = AgentFinding(
    finding_id="AF-E-2",
    run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
    agent_name="Endpoint Agent",
    title="Fresh Endpoint Finding",
    description="Fresh endpoint activity",
    severity="HIGH",
    confidence=0.85,
    evidence={"host": "WS-EXPIRED", "event_ids": ["EVT-E-2"]},
    source_event_ids=["EVT-E-2"],
    created_at=now
)
db.add_all([f_e1, f_e2])
db.commit()

inc_count_pre_e = db.query(Incident).count()
corr_e = CorrelationAgent(db)
# Evaluate using canonical window 900s
res_e = corr_e.execute({"window_seconds": 900})
inc_count_post_e = db.query(Incident).count()

db.refresh(f_e1)
db.refresh(f_e2)

print(f"Incident count before: {inc_count_pre_e}, after: {inc_count_post_e}")
print(f"f_e1.incident_id: {f_e1.incident_id}, f_e2.incident_id: {f_e2.incident_id}")

verify_case(
    "Case E: Related Findings Outside 900s Window",
    inc_count_post_e == inc_count_pre_e and f_e1.incident_id is None and f_e2.incident_id is None,
    "Findings separated by >900s do not cluster into an incident"
)
db.close()


# =============================================================================
# SCENARIO F: A delayed related finding arrives -> UPDATE EXISTING OPEN INCIDENT
# =============================================================================
log_header("SCENARIO F: Delayed related finding arrives -> UPDATE EXISTING INCIDENT")
db = SessionLocal()
now = datetime.now(timezone.utc)

# Recall incident from Scenario C
inc_c = db.query(Incident).filter(Incident.incident_id == inc_c_id).first()
orig_incident_id = inc_c.incident_id
orig_finding_count = inc_c.finding_count
print(f"Existing Incident ID: {orig_incident_id}, Initial Finding Count: {orig_finding_count}")

# Delayed finding arrives within 900s on same host 'WS-CORR'
e_f3 = SecurityEvent(event_id="EVT-C-3", timestamp=now, event_type="network_traffic", severity="CRITICAL", host="WS-CORR", source_ip="198.51.100.99")
db.add(e_f3)
db.commit()

f_f3 = AgentFinding(
    finding_id="AF-C-3",
    run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
    agent_name="Threat Intelligence Agent",
    title="CTI Beacon Match",
    description="Delayed CTI detection on same host",
    severity="CRITICAL",
    confidence=0.98,
    evidence={"host": "WS-CORR", "source_ip": "198.51.100.99", "event_ids": ["EVT-C-3"]},
    source_event_ids=["EVT-C-3"],
    created_at=now
)
db.add(f_f3)
db.commit()

corr_f = CorrelationAgent(db)
res_f = corr_f.execute({})

db.refresh(inc_c)
db.refresh(f_f3)

print(f"Post-update Incident ID: {inc_c.incident_id} (Preserved: {inc_c.incident_id == orig_incident_id})")
print(f"Updated Finding Count: {inc_c.finding_count} (Previous: {orig_finding_count})")
print(f"Participating Agents: {inc_c.participating_agents}")
print(f"Updated Severity: {inc_c.severity}")
print(f"f_f3.incident_id: {f_f3.incident_id}")

verify_case(
    "Case F: Delayed Related Finding Updates Existing Incident",
    inc_c.incident_id == orig_incident_id and inc_c.finding_count == 3 and "Threat Intelligence Agent" in inc_c.participating_agents and f_f3.incident_id == orig_incident_id and inc_c.severity == "CRITICAL",
    f"Incident ID preserved ({orig_incident_id}), finding count incremented to 3, CTI agent added, severity elevated"
)
db.close()


# =============================================================================
# SCENARIO G: Repeated processing is IDEMPOTENT (no duplicates)
# =============================================================================
log_header("SCENARIO G: Repeated correlation execution -> IDEMPOTENT")
db = SessionLocal()
corr_g = CorrelationAgent(db)

count_inc_before = db.query(Incident).count()
count_links_before = db.query(IncidentFinding).count()

# Run 3 consecutive correlation cycles
corr_g.execute({})
corr_g.execute({})
corr_g.execute({})

count_inc_after = db.query(Incident).count()
count_links_after = db.query(IncidentFinding).count()

print(f"Incidents: {count_inc_before} -> {count_inc_after}")
print(f"IncidentFinding Links: {count_links_before} -> {count_links_after}")

verify_case(
    "Case G: Idempotent Execution",
    count_inc_before == count_inc_after and count_links_before == count_links_after,
    "Multiple correlation passes produce 0 duplicate incidents and 0 duplicate links"
)
db.close()


# =============================================================================
# SCENARIO H: Threat Intelligence enrichment of a SINGLE event does NOT create incident
# =============================================================================
log_header("SCENARIO H: CTI enrichment of a single event alone -> NO INCIDENT")
db = SessionLocal()
now = datetime.now(timezone.utc)

# 1 Network Event on host WS-ISOLATED
e_h1 = SecurityEvent(
    event_id="EVT-H-1",
    timestamp=now,
    event_type="network_connection",
    severity="HIGH",
    source_ip="203.0.113.111",
    host="WS-ISOLATED"
)
db.add(e_h1)
db.commit()

# Finding 1: Network Monitoring Agent finding from EVT-H-1
f_h1 = AgentFinding(
    finding_id="AF-H-1",
    run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
    agent_name="Network Monitoring Agent",
    title="Network Ingress Flow",
    description="Network flow detected",
    severity="HIGH",
    confidence=0.88,
    evidence={"host": "WS-ISOLATED", "source_ip": "203.0.113.111", "event_ids": ["EVT-H-1"]},
    source_event_ids=["EVT-H-1"],
    created_at=now
)
# Finding 2: Threat Intelligence Agent enriches THAT SAME EVENT EVT-H-1
f_h2 = AgentFinding(
    finding_id="AF-H-2",
    run_id=f"RUN-{uuid.uuid4().hex[:8].upper()}",
    agent_name="Threat Intelligence Agent",
    title="CTI Indicator Match",
    description="IP matches threat indicator",
    severity="HIGH",
    confidence=0.90,
    evidence={"host": "WS-ISOLATED", "source_ip": "203.0.113.111", "event_ids": ["EVT-H-1"]},
    source_event_ids=["EVT-H-1"],  # Exact same event ID
    created_at=now
)
db.add_all([f_h1, f_h2])
db.commit()

inc_count_pre_h = db.query(Incident).count()

corr_h = CorrelationAgent(db)
res_h = corr_h.execute({"findings": [f_h1, f_h2]})

inc_count_post_h = db.query(Incident).count()
db.refresh(f_h1)
db.refresh(f_h2)

print(f"Incidents count before: {inc_count_pre_h}, after: {inc_count_post_h}")
print(f"f_h1.incident_id: {f_h1.incident_id}, f_h2.incident_id: {f_h2.incident_id}")

verify_case(
    "Case H: Single-Event Enrichment Alone",
    inc_count_post_h == inc_count_pre_h and f_h1.incident_id is None and f_h2.incident_id is None,
    "2 findings referencing the exact same 1 source event (distinct_source_events < 2) do not create an incident"
)
db.close()


# =============================================================================
# DOWNSTREAM PIPELINE VERIFICATION (ATTACK PATH, RCA, RISK, SOAR, VERIFICATION)
# =============================================================================
log_header("DOWNSTREAM PIPELINE: Attack Path, 8-Question RCA, Risk Scoring, SOAR")
db = SessionLocal()
inc = db.query(Incident).filter(Incident.incident_id == inc_c_id).first()

# 1. Attack Path Agent
ap_agent = AttackPathAgent(db)
ap_res = ap_agent.execute({"incident_id": inc.incident_id})
graph = ap_res["data"]["graph"]
print(f"Attack Path Nodes: {[n['id'] for n in graph['nodes']]}")
print(f"Attack Path Edges: {[e['id'] for e in graph['edges']]}")

# 2. Investigation Agent (8 Canonical Questions)
inv_agent = InvestigationAgent(db)
inv_res = inv_agent.execute({"incident_id": inc.incident_id})
ai_summary = inv_res["data"]["ai_summary"]
canonical_questions = [
    "what_happened", "which_asset_was_affected", "when_did_it_happen",
    "what_initiated_the_activity", "which_techniques_were_observed",
    "what_evidence_supports_the_finding", "what_was_the_impact",
    "what_remediation_is_recommended"
]
all_answers_present = all(ai_summary.get(q) for q in canonical_questions)
print(f"8 Canonical Answers Present: {all_answers_present}")
for q in canonical_questions:
    print(f"  - {q}: {str(ai_summary[q])[:60]}...")

# 3. Risk Assessment Progression
risk = calculate_incident_risk(db, inc)
print(f"Risk Overall Score: {risk.overall_score}, Stage: {risk.progression_stage}, Band: {risk.severity_band}")

# 4. SOAR Response Formulation & Approval Gate
resp_agent = ResponseAgent(db)
resp_res = resp_agent.execute({"incident_id": inc.incident_id})
actions = db.query(ResponseAction).filter(ResponseAction.incident_id == inc.incident_id).all()
print(f"Formulated SOAR Actions: {[f'{a.action_type} ({a.status}, requires_approval={a.requires_approval})' for a in actions]}")

block_action = next((a for a in actions if a.action_type == "BLOCK_IP"), None)
approval_gate_passed = False
if block_action:
    # Attempt execution before approval -> must fail
    try:
        execute_response_action(db, block_action.action_id, actor="SOAR Engine", dry_run=False)
    except Exception as exc:
        if getattr(exc, "status_code", None) == 403:
            print("Verified: Execution before approval rejected with HTTP 403 Forbidden")
            approve_response_action(db, block_action.action_id, approved_by="SOC Admin")
            print("Action approved by SOC Admin")
            approval_gate_passed = True

verify_case(
    "Downstream Pipeline Verification",
    len(graph["nodes"]) >= 2 and all_answers_present and risk.overall_score > 0 and approval_gate_passed,
    "Attack graph synthesized, all 8 canonical RCA answers populated, risk scored, and SOAR approval gate enforced"
)
db.close()


# =============================================================================
# SUMMARY VERIFICATION MATRIX
# =============================================================================
log_header("FINAL INDEPENDENT VERIFICATION MATRIX")
all_passed = True
for case, st in results_matrix.items():
    print(f"[{st:4s}] {case}")
    if st != "PASS":
        all_passed = False

print(f"\nFinal Verdict: {'ALL CHECKS PASSED (100% VERIFIED)' if all_passed else 'VERIFICATION FAILED'}")
