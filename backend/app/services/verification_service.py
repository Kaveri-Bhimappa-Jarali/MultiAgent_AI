import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.models.response import ResponseAction, VerificationResult
from app.models.incident import Incident, IncidentAudit
from app.models.event import SecurityEvent
from app.services.audit_service import log_audit_entry

def create_and_run_verification(db: Session, action_id: str, incident_id: str) -> VerificationResult:
    action = db.query(ResponseAction).filter(ResponseAction.action_id == action_id).first()
    if not action:
        return None

    ver_id = f"VER-{uuid.uuid4().hex[:8].upper()}"
    exec_time = action.executed_at or datetime.now(timezone.utc)
    
    # Query subsequent events after execution involving the action's target
    target_val = action.target_value
    subsequent_events = db.query(SecurityEvent).filter(
        SecurityEvent.timestamp >= exec_time,
        (
            (SecurityEvent.source_ip == target_val) |
            (SecurityEvent.destination_ip == target_val) |
            (SecurityEvent.username == target_val) |
            (SecurityEvent.host == target_val)
        )
    ).all()

    # Analyze subsequent behavior
    active_threats = [
        e for e in subsequent_events 
        if e.severity in ["HIGH", "CRITICAL"] and not ("DROP" in (e.file_action or "") or "BLOCKED" in (e.file_action or ""))
    ]

    checks = [
        {
            "check": "Post-mitigation observation window",
            "parameter": "Events timestamped >= mitigation execution",
            "passed": True
        },
        {
            "check": f"Target entity containment test ({target_val})",
            "observed_events": len(subsequent_events),
            "uncontained_threats": len(active_threats),
            "passed": len(active_threats) == 0
        }
    ]

    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()

    # Check if this action was executed via a real VM guest agent
    from app.models.vm_node import VMAction
    vm_action = db.query(VMAction).filter(VMAction.target_value == target_val).order_by(VMAction.created_at.desc()).first()
    is_real_vm_action = bool(vm_action and vm_action.status == "EXECUTED_ON_VM")

    if len(active_threats) > 0:
        ver_status = "VERIFICATION_FAILED"
        evidence_summary = (
            f"Verification FAILED: Observed {len(active_threats)} ongoing uncontained high-severity "
            f"telemetry events from target '{target_val}' post-execution. Threat has bypassed or persisted past defensive rule."
        )
        if incident:
            incident.status = "INVESTIGATING"
            incident.response_status = "FAILED"
            db.add(IncidentAudit(
                incident_id=incident.incident_id,
                actor="Verification Engine",
                action="VERIFICATION_FAILED_REOPENED",
                previous_state="CONTAINED",
                new_state="INVESTIGATING",
                timestamp=datetime.now(timezone.utc)
            ))
    elif len(subsequent_events) > 0:
        dropped_count = sum(1 for e in subsequent_events if "DROP" in (e.file_action or "").upper() or "BLOCK" in (e.file_action or "").upper() or "REJECT" in (e.file_action or "").upper())
        if dropped_count > 0:
            ver_status = "ACTUAL_LAB_RESPONSE_VERIFIED" if is_real_vm_action else "SIMULATED_RESPONSE_VERIFIED"
            evidence_summary = (
                f"{'Actual Lab VM' if is_real_vm_action else 'Simulated Environment'} Verified: "
                f"Observed {dropped_count} subsequent telemetry flows from '{target_val}' explicitly dropped/rejected by netfilter enforcement."
            )
            if incident:
                incident.response_status = "VERIFIED"
        else:
            ver_status = "VERIFICATION_INCONCLUSIVE"
            evidence_summary = (
                f"Verification Inconclusive: Observed {len(subsequent_events)} subsequent telemetry events from '{target_val}', "
                "but none matched explicit drop/block signatures."
            )
    else:
        # Zero events observed yet - window is active, do not assume containment prematurely
        ver_status = "PENDING_VERIFICATION"
        evidence_summary = (
            f"Observation Window Active (Pending): Zero subsequent telemetry events observed from '{target_val}' "
            "since mitigation execution. Awaiting post-response traffic flows to confirm containment."
        )
        if incident:
            incident.response_status = "PENDING_VERIFICATION"

    # Save or update VerificationResult
    ver_result = db.query(VerificationResult).filter(VerificationResult.action_id == action_id).first()
    if not ver_result:
        ver_result = VerificationResult(
            verification_id=ver_id,
            action_id=action_id,
            incident_id=incident_id,
            verification_status=ver_status,
            checks_performed=checks,
            observed_events_count=len(subsequent_events),
            evidence_summary=evidence_summary,
            verified_at=datetime.now(timezone.utc)
        )
        db.add(ver_result)
    else:
        ver_result.verification_status = ver_status
        ver_result.checks_performed = checks
        ver_result.observed_events_count = len(subsequent_events)
        ver_result.evidence_summary = evidence_summary
        ver_result.verified_at = datetime.now(timezone.utc)

    db.commit()

    log_audit_entry(
        db,
        actor="Verification Engine",
        action="RUN_RESPONSE_VERIFICATION",
        target_type="VERIFICATION_RESULT",
        target_id=ver_result.verification_id,
        details={"status": ver_status, "action_id": action_id, "incident_id": incident_id}
    )

    return ver_result
