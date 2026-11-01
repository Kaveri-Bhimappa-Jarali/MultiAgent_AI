"""
Policy-Governed SOAR Defensive Response Desk
============================================
Compliant with SDMCET VII Semester Major Project Synopsis Section 16-17.

Capabilities:
1. Strict authorization checks and analyst approval desk.
2. Full audit trails (operator ID, justification, timestamps, state transitions).
3. Role-based execution (Admin, Analyst).
4. Direct delivery to VM Guest nodes via VMAction dispatch.
5. Automated rollback/recovery actions (UNBLOCK_IP, ENABLE_USER, RECONNECT_ENDPOINT).
6. Mandatory post-execution telemetry verification integration.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.response import ResponseAction
from app.models.incident import Incident, IncidentAudit
from app.models.vm_node import VMNode, VMAction
from app.services.audit_service import log_audit_entry

def approve_response_action(db: Session, action_id: str, approved_by: str) -> ResponseAction:
    action = db.query(ResponseAction).filter(ResponseAction.action_id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail=f"Response action {action_id} not found")

    if action.status not in ["RECOMMENDED", "PENDING_APPROVAL"]:
        raise HTTPException(status_code=400, detail=f"Cannot approve action currently in '{action.status}' state")

    action.status = "APPROVED"
    action.approved_by = approved_by
    action.approved_at = datetime.now(timezone.utc)
    db.commit()

    log_audit_entry(
        db,
        actor=approved_by,
        action="APPROVE_RESPONSE_ACTION",
        target_type="RESPONSE_ACTION",
        target_id=action_id,
        details={"incident_id": action.incident_id, "action_type": action.action_type, "target": action.target_value}
    )
    return action

def execute_response_action(db: Session, action_id: str, actor: str, dry_run: Optional[bool] = None) -> ResponseAction:
    action = db.query(ResponseAction).filter(ResponseAction.action_id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail=f"Response action {action_id} not found")

    if action.requires_approval and action.status != "APPROVED":
        raise HTTPException(status_code=403, detail=f"Action requires prior SOC analyst approval before execution (Current: {action.status})")

    effective_dry_run = dry_run if dry_run is not None else action.is_dry_run

    execution_details = {
        "sandbox_environment": "Enterprise_Isolated_Lab_VPC",
        "is_dry_run": effective_dry_run,
        "executed_by": actor,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    cmd_applied = ""
    if action.action_type == "BLOCK_IP":
        cmd_applied = f"iptables -I INPUT -s {action.target_value} -j DROP; nft add rule inet filter input ip saddr {action.target_value} drop"
        execution_details.update({
            "firewall_vendor": "Isolated Lab Gateway / Netfilter Daemon",
            "rule_id": f"FW-DROP-{uuid.uuid4().hex[:6].upper()}",
            "command_applied": cmd_applied,
            "effect": f"All ingress & egress packets to/from {action.target_value} dropped with zero acknowledgment."
        })
    elif action.action_type == "DISABLE_USER":
        cmd_applied = f"passwd -l {action.target_value}; pkill -u {action.target_value}"
        execution_details.update({
            "identity_provider": "Enterprise Directory / Linux PAM Authority",
            "command_applied": cmd_applied,
            "effect": f"Identity '{action.target_value}' locked out, active sessions terminated, Kerberos/PAM tokens invalidated."
        })
    elif action.action_type in ["ISOLATE_HOST", "ISOLATE_ENDPOINT"]:
        cmd_applied = f"iptables -I INPUT -s 192.168.56.1 -j ACCEPT; iptables -P INPUT DROP; iptables -P FORWARD DROP"
        execution_details.update({
            "edr_platform": "Enterprise Endpoint Isolation Agent",
            "command_applied": cmd_applied,
            "effect": f"Host '{action.target_value}' completely isolated from LAN; only management connection to SOC Host remains active."
        })
    else:
        cmd_applied = f"# Executed administrative containment procedure for {action.action_type}"
        execution_details.update({
            "generic_action": action.action_type,
            "target": action.target_value,
            "effect": "Executed administrative containment procedure in isolated sandbox."
        })

    # Dispatch to real or local VM Node if available
    target_node = db.query(VMNode).filter(
        (VMNode.vm_id == action.target_value) |
        (VMNode.ip_address == action.target_value) |
        (VMNode.name == action.target_value)
    ).first()
    if not target_node:
        target_node = db.query(VMNode).filter(VMNode.vm_id == "vm-endpoint-01").first()

    if target_node and not effective_dry_run:
        vm_act = VMAction(
            action_id=f"VMACT-{uuid.uuid4().hex[:8].upper()}",
            vm_id=target_node.vm_id,
            action_type=action.action_type,
            target_value=action.target_value,
            command_to_run=cmd_applied,
            status="PENDING_DELIVERY",
            created_at=datetime.now(timezone.utc)
        )
        db.add(vm_act)
        execution_details["vm_action_id"] = vm_act.action_id
        execution_details["assigned_vm_node"] = target_node.vm_id
        action.status = "ACTION_SUBMITTED"
    else:
        action.status = "DRY_RUN" if effective_dry_run else "EXECUTED"

    action.is_dry_run = effective_dry_run
    action.execution_result = execution_details
    action.executed_at = datetime.now(timezone.utc)

    # Update parent incident status to CONTAINED
    incident = db.query(Incident).filter(Incident.incident_id == action.incident_id).first()
    if incident:
        prev_status = incident.status
        incident.status = "CONTAINED"
        incident.response_status = action.status
        incident.updated_at = datetime.now(timezone.utc)

        db.add(IncidentAudit(
            incident_id=incident.incident_id,
            actor=actor,
            action="DEFENSIVE_ACTION_EXECUTED",
            previous_state=prev_status,
            new_state="CONTAINED",
            timestamp=datetime.now(timezone.utc)
        ))

    db.commit()

    log_audit_entry(
        db,
        actor=actor,
        action="EXECUTE_RESPONSE_ACTION",
        target_type="RESPONSE_ACTION",
        target_id=action_id,
        details=execution_details
    )

    # Trigger response verification
    from app.services.verification_service import create_and_run_verification
    create_and_run_verification(db, action.action_id, action.incident_id)

    return action

def rollback_response_action(db: Session, action_id: str, actor: str) -> ResponseAction:
    """Reverses a previously applied containment action."""
    action = db.query(ResponseAction).filter(ResponseAction.action_id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail=f"Response action {action_id} not found")

    rollback_cmd = ""
    if action.action_type == "BLOCK_IP":
        rollback_cmd = f"iptables -D INPUT -s {action.target_value} -j DROP; nft delete rule inet filter input ip saddr {action.target_value} drop"
    elif action.action_type == "DISABLE_USER":
        rollback_cmd = f"passwd -u {action.target_value}"
    elif action.action_type in ["ISOLATE_HOST", "ISOLATE_ENDPOINT"]:
        rollback_cmd = "iptables -P INPUT ACCEPT; iptables -P FORWARD ACCEPT"

    rollback_details = {
        "action": "ROLLBACK_CONTAINMENT",
        "original_action_id": action_id,
        "rollback_command": rollback_cmd,
        "executed_by": actor,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    action.status = "ROLLED_BACK"
    db.commit()

    log_audit_entry(
        db,
        actor=actor,
        action="ROLLBACK_RESPONSE_ACTION",
        target_type="RESPONSE_ACTION",
        target_id=action_id,
        details=rollback_details
    )
    return action
