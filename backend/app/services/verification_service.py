import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models.event import SecurityEvent
from app.models.incident import Incident, IncidentAudit
from app.models.response import ResponseAction, VerificationResult
from app.models.vm_node import VMAction
from app.services.audit_service import log_audit_entry


def _new_verification(
    db: Session,
    action: ResponseAction,
    status: str,
    checks: list[Dict[str, Any]],
    observed_events: int,
    evidence: str,
) -> VerificationResult:
    result = VerificationResult(
        verification_id=f"VER-{uuid.uuid4().hex[:8].upper()}",
        action_id=action.action_id,
        incident_id=action.incident_id,
        verification_status=status,
        checks_performed=checks,
        observed_events_count=observed_events,
        evidence_summary=evidence,
        verified_at=datetime.now(timezone.utc),
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


def create_simulation_verification(
    db: Session,
    action: ResponseAction,
    actor: str,
    incident_status_before: Optional[str] = None,
) -> VerificationResult:
    details = action.execution_result or {}
    incident = db.query(Incident).filter(Incident.incident_id == action.incident_id).first()
    incident_unchanged = (
        incident is None
        or incident_status_before is None
        or incident.status == incident_status_before
    )
    guest_evidence = details.get("simulation_evidence") or {}
    guest_action = (
        db.query(VMAction).filter(VMAction.action_id == details.get("vm_action_id")).first()
        if details.get("vm_action_id")
        else None
    )
    direct_simulation = not details.get("execution_dispatched") and not details.get("vm_action_id")
    guest_simulation = (
        details.get("execution_dispatched") is True
        and guest_action is not None
        and guest_action.status == "SIMULATED_ON_VM"
        and guest_evidence.get("simulated") is True
        and guest_evidence.get("actual_execution") is False
    )
    no_dispatch = direct_simulation or guest_simulation
    simulation_recorded = (
        action.status == "SIMULATED"
        and details.get("is_simulation") is True
        and details.get("actual_system_changes") is False
    )
    passed = simulation_recorded and no_dispatch and incident_unchanged
    status = "SIMULATED" if passed else "FAILED"
    if not passed:
        action.status = "FAILED"
        db.commit()
    checks = [
        {
            "check": "Simulation-only response record persisted",
            "passed": simulation_recorded,
            "evidence_source": "response_actions.execution_result",
        },
        {
            "check": "No real system command was executed",
            "passed": no_dispatch,
            "evidence_source": (
                "vm_actions.status and authenticated guest result"
                if guest_simulation
                else "response_actions.execution_result"
            ),
        },
        {
            "check": "Associated incident state was not changed by simulation",
            "passed": incident_unchanged,
            "evidence_source": "incidents.status",
        },
    ]
    evidence = (
        f"SIMULATED ONLY: {action.action_type} for '{action.target_value}' was evaluated by the "
        "SOAR simulation path. Evidence confirms that no real system command was executed and "
        "the associated incident state was unchanged. This is not actual containment."
        if passed
        else "Simulation verification failed an application-state safety check. No containment is claimed."
    )
    result = _new_verification(db, action, status, checks, 0, evidence)
    log_audit_entry(
        db,
        actor=actor,
        action="VERIFY_SIMULATED_RESPONSE",
        target_type="VERIFICATION_RESULT",
        target_id=result.verification_id,
        details={"action_id": action.action_id, "incident_id": action.incident_id, "status": status},
    )
    return result


def create_and_run_verification(db: Session, action_id: str, incident_id: str) -> Optional[VerificationResult]:
    action = db.query(ResponseAction).filter(ResponseAction.action_id == action_id).first()
    if not action:
        return None

    if action.status == "SIMULATED":
        latest_simulation = (
            db.query(VerificationResult)
            .filter(
                VerificationResult.action_id == action_id,
                VerificationResult.verification_status == "SIMULATED",
            )
            .order_by(VerificationResult.verified_at.desc())
            .first()
        )
        return latest_simulation or create_simulation_verification(db, action, "Verification Engine")

    details = action.execution_result or {}
    vm_action_id = details.get("vm_action_id")
    vm_action = (
        db.query(VMAction).filter(VMAction.action_id == vm_action_id).first()
        if vm_action_id
        else None
    )
    if vm_action is None or vm_action.status == "PENDING_VM_PULL":
        action.status = "PENDING_VERIFICATION"
        db.commit()
        result = _new_verification(
            db,
            action,
            "PENDING_VERIFICATION",
            [{
                "check": "Guest execution acknowledgement received",
                "passed": False,
                "evidence_source": "vm_actions.status",
            }],
            0,
            "Pending verification: the registered guest has not yet acknowledged execution. No containment is claimed.",
        )
        log_audit_entry(
            db,
            actor="Verification Engine",
            action="RUN_RESPONSE_VERIFICATION",
            target_type="VERIFICATION_RESULT",
            target_id=result.verification_id,
            details={"status": result.verification_status, "action_id": action_id, "incident_id": incident_id},
        )
        return result

    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if vm_action.status == "SIMULATED_ON_VM":
        action.status = "SIMULATED"
        action.is_dry_run = True
        action.execution_result = {
            **details,
            "simulation_status": "SIMULATED",
            "is_simulation": True,
            "actual_system_changes": False,
            "execution_dispatched": False,
            "simulation_evidence": vm_action.vm_execution_result or {},
        }
        db.commit()
        db.refresh(action)
        return create_simulation_verification(db, action, "Verification Engine", incident.status if incident else None)

    if vm_action.status == "FAILED_ON_VM":
        action.status = "FAILED"
        evidence = "The registered guest reported that the response command failed. Containment was not verified."
        checks = [{
            "check": "Guest execution result",
            "passed": False,
            "evidence_source": "vm_actions.vm_execution_result",
        }]
        ver_status = "FAILED"
        if incident:
            incident.response_status = "FAILED"
            if incident.status == "CONTAINED":
                incident.status = "INVESTIGATING"
                db.add(IncidentAudit(
                    incident_id=incident.incident_id,
                    actor="Verification Engine",
                    action="VERIFICATION_FAILED_REOPENED",
                    previous_state="CONTAINED",
                    new_state="INVESTIGATING",
                    timestamp=datetime.now(timezone.utc),
                ))
    else:
        execution_time = vm_action.executed_at or datetime.now(timezone.utc)
        target = action.target_value
        subsequent_events = db.query(SecurityEvent).filter(
            SecurityEvent.timestamp >= execution_time,
            (
                (SecurityEvent.source_ip == target)
                | (SecurityEvent.destination_ip == target)
                | (SecurityEvent.username == target)
                | (SecurityEvent.host == target)
            ),
        ).all()
        active_threats = [
            event for event in subsequent_events
            if event.severity in {"HIGH", "CRITICAL"}
            and not any(
                marker in (event.file_action or "").upper()
                for marker in ("DROP", "BLOCKED", "REJECT")
            )
        ]
        dropped_events = [
            event for event in subsequent_events
            if any(
                marker in (event.file_action or "").upper()
                for marker in ("DROP", "BLOCK", "REJECT")
            )
        ]
        checks = [
            {
                "check": "Guest execution acknowledgement received",
                "passed": vm_action.status == "EXECUTED_ON_VM",
                "evidence_source": "vm_actions.vm_execution_result",
            },
            {
                "check": "No uncontained high-severity telemetry observed",
                "passed": not active_threats,
                "observed_events": len(subsequent_events),
                "uncontained_threats": len(active_threats),
                "evidence_source": "security_events",
            },
            {
                "check": "Post-action block or reject telemetry observed",
                "passed": bool(dropped_events),
                "observed_block_events": len(dropped_events),
                "evidence_source": "security_events.file_action",
            },
        ]
        if active_threats:
            action.status = "FAILED"
            ver_status = "FAILED"
            evidence = (
                f"Verification failed: {len(active_threats)} uncontained high-severity event(s) "
                f"were observed for '{target}' after the guest acknowledged the action."
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
                    timestamp=datetime.now(timezone.utc),
                ))
        elif dropped_events:
            action.status = "VERIFIED"
            ver_status = "VERIFIED"
            evidence = (
                f"Actual lab response verified: guest execution was acknowledged and "
                f"{len(dropped_events)} subsequent drop/reject telemetry event(s) were observed. "
                "This evidence applies to the registered lab target only."
            )
            if incident:
                incident.status = "CONTAINED"
                incident.response_status = "VERIFIED"
        elif subsequent_events:
            action.status = "EXECUTED"
            ver_status = "INCONCLUSIVE"
            evidence = (
                f"The guest acknowledged execution, but {len(subsequent_events)} subsequent "
                "event(s) contained no explicit drop/reject evidence. Containment is not verified."
            )
        else:
            action.status = "PENDING_VERIFICATION"
            ver_status = "PENDING_VERIFICATION"
            evidence = (
                f"The guest acknowledged execution for '{target}', but no post-action telemetry "
                "is available yet. Containment remains pending verification."
            )
        if incident and ver_status != "VERIFIED" and ver_status != "FAILED":
            incident.response_status = "PENDING_VERIFICATION"

    db.commit()
    result = _new_verification(
        db,
        action,
        ver_status,
        checks,
        len(subsequent_events) if vm_action.status == "EXECUTED_ON_VM" else 0,
        evidence,
    )
    log_audit_entry(
        db,
        actor="Verification Engine",
        action="RUN_RESPONSE_VERIFICATION",
        target_type="VERIFICATION_RESULT",
        target_id=result.verification_id,
        details={"status": ver_status, "action_id": action_id, "incident_id": incident_id},
    )
    return result
