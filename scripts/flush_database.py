"""
Database flush utility for Multi-Agent AI SOC.
Cleans all transactional / operational data:
- Security Events
- Detection Findings
- Agent Executions & Findings
- Incidents, Incident Events, Notes, Audits
- Risk Assessments
- SOAR Response Actions & Verification Results
- Attack Simulation Executions
- Audit Logs & Evaluation Runs

Preserves:
- Users & Auth Credentials
- Detection Rules
- Threat Intelligence (CTI) Indicators
- Monitored VM Nodes (resets counters to 0)
"""
import sys
import os

# Add backend directory to path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.database import SessionLocal
from app.models import (
    SecurityEvent,
    DetectionFinding,
    AgentExecution,
    AgentFinding,
    Incident,
    IncidentEvent,
    IncidentNote,
    IncidentAudit,
    RiskAssessment,
    ResponseAction,
    VerificationResult,
    AttackSimulationExecution,
    AuditLog,
    EvaluationRun,
    VMNode,
    VMAction,
    User,
    DetectionRule,
    ThreatIndicator
)

def flush_database():
    db = SessionLocal()
    try:
        print("=== Multi-Agent AI SOC: Database Flush ===")
        print("1. Counting existing records...")
        counts_before = {
            "security_events": db.query(SecurityEvent).count(),
            "detection_findings": db.query(DetectionFinding).count(),
            "agent_executions": db.query(AgentExecution).count(),
            "agent_findings": db.query(AgentFinding).count(),
            "incidents": db.query(Incident).count(),
            "incident_events": db.query(IncidentEvent).count(),
            "incident_notes": db.query(IncidentNote).count(),
            "incident_audits": db.query(IncidentAudit).count(),
            "risk_assessments": db.query(RiskAssessment).count(),
            "response_actions": db.query(ResponseAction).count(),
            "verification_results": db.query(VerificationResult).count(),
            "attack_simulations": db.query(AttackSimulationExecution).count(),
            "audit_logs": db.query(AuditLog).count(),
            "evaluation_runs": db.query(EvaluationRun).count(),
        }
        for table, cnt in counts_before.items():
            print(f"  {table}: {cnt}")

        print("\n2. Deleting operational records in dependency order...")
        db.query(VerificationResult).delete(synchronize_session=False)
        db.query(ResponseAction).delete(synchronize_session=False)
        db.query(IncidentNote).delete(synchronize_session=False)
        db.query(IncidentAudit).delete(synchronize_session=False)
        db.query(IncidentEvent).delete(synchronize_session=False)
        db.query(RiskAssessment).delete(synchronize_session=False)
        db.query(Incident).delete(synchronize_session=False)
        db.query(AgentFinding).delete(synchronize_session=False)
        db.query(AgentExecution).delete(synchronize_session=False)
        db.query(DetectionFinding).delete(synchronize_session=False)
        db.query(SecurityEvent).delete(synchronize_session=False)
        db.query(AttackSimulationExecution).delete(synchronize_session=False)
        db.query(AuditLog).delete(synchronize_session=False)
        db.query(EvaluationRun).delete(synchronize_session=False)
        db.query(VMAction).delete(synchronize_session=False)

        print("\n3. Resetting VM Node telemetry counters...")
        nodes = db.query(VMNode).all()
        for node in nodes:
            node.events_count = 0
            node.detections_count = 0
            node.last_telemetry_at = None
            if isinstance(node.system_metrics, dict):
                node.system_metrics["events_sent"] = 0
                node.system_metrics["actions_executed"] = 0
                node.system_metrics["actions_simulated"] = 0
                node.system_metrics["actions_failed"] = 0

        db.commit()

        print("\n4. Preserved entities verification:")
        print(f"  Users: {db.query(User).count()} (Admin credentials preserved)")
        print(f"  Detection Rules: {db.query(DetectionRule).count()} (Detection rules preserved)")
        print(f"  CTI Threat Indicators: {db.query(ThreatIndicator).count()} (Threat intel preserved)")
        print(f"  VM Nodes: {db.query(VMNode).count()} (Infrastructure nodes preserved)")

        print("\n5. Verification after flush:")
        counts_after = {
            "security_events": db.query(SecurityEvent).count(),
            "detection_findings": db.query(DetectionFinding).count(),
            "agent_findings": db.query(AgentFinding).count(),
            "incidents": db.query(Incident).count(),
            "response_actions": db.query(ResponseAction).count(),
        }
        for table, cnt in counts_after.items():
            print(f"  {table}: {cnt}")
            assert cnt == 0, f"Expected 0 in {table}, got {cnt}"

        print("\n[SUCCESS] Database flushed cleanly. SOC is ready for fresh dynamic telemetry.")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Database flush failed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    flush_database()
