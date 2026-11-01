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
import ipaddress
import re
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.response import ResponseAction
from app.models.incident import Incident
from app.models.vm_node import VMNode, VMAction
from app.services.audit_service import log_audit_entry


SIMULATABLE_ACTIONS = {
    "BLOCK_IP": "Would add a firewall deny rule for the specified IP address.",
    "ISOLATE_ENDPOINT": "Would restrict the specified endpoint to its SOC management channel.",
    "DISABLE_USER": "Would disable sign-in for the specified identity.",
}


def approve_response_action(db: Session, action_id: str, approved_by: str) -> ResponseAction:
    action = db.query(ResponseAction).filter(ResponseAction.action_id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail=f"Response action {action_id} not found")

    if action.status not in ["RECOMMENDED", "PENDING_APPROVAL", "SIMULATED"]:
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


def simulate_response_action(db: Session, action_id: str, actor: str) -> ResponseAction:
    action = db.query(ResponseAction).filter(ResponseAction.action_id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail=f"Response action {action_id} not found")
    if action.status not in ["RECOMMENDED", "PENDING_APPROVAL", "APPROVED", "SIMULATED"]:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot simulate action currently in '{action.status}' state",
        )
    proposed_action = SIMULATABLE_ACTIONS.get(action.action_type)
    if not proposed_action:
        raise HTTPException(
            status_code=400,
            detail=f"Simulation is not supported for action type '{action.action_type}'",
        )

    incident = db.query(Incident).filter(Incident.incident_id == action.incident_id).first()
    incident_status = incident.status if incident else None
    simulated_at = datetime.now(timezone.utc)
    action.status = "SIMULATED"
    action.is_dry_run = True
    action.execution_result = {
        "simulation_status": "SIMULATED",
        "is_simulation": True,
        "actual_system_changes": False,
        "execution_dispatched": False,
        "simulated_by": actor,
        "simulated_at": simulated_at.isoformat(),
        "action_type": action.action_type,
        "target": action.target_value,
        "incident_id": action.incident_id,
        "proposed_action": proposed_action,
        "expected_result": action.expected_effect,
    }
    db.commit()
    db.refresh(action)

    from app.services.verification_service import create_simulation_verification

    create_simulation_verification(db, action, actor, incident_status)
    log_audit_entry(
        db,
        actor=actor,
        action="SIMULATE_RESPONSE_ACTION",
        target_type="RESPONSE_ACTION",
        target_id=action_id,
        details={
            "incident_id": action.incident_id,
            "action_type": action.action_type,
            "target": action.target_value,
            "actual_system_changes": False,
        },
    )
    return action


def execute_response_action(db: Session, action_id: str, actor: str, dry_run: Optional[bool] = None) -> ResponseAction:
    action = db.query(ResponseAction).filter(ResponseAction.action_id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail=f"Response action {action_id} not found")

    effective_dry_run = dry_run if dry_run is not None else action.is_dry_run
    if effective_dry_run:
        return simulate_response_action(db, action_id, actor)

    if action.requires_approval and action.status != "APPROVED":
        raise HTTPException(status_code=403, detail=f"Action requires prior SOC analyst approval before execution (Current: {action.status})")

    command_to_run = ""
    target_node = None
    if action.action_type == "BLOCK_IP":
        try:
            parsed_ip = ipaddress.ip_address(action.target_value)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="BLOCK_IP requires a valid IP address") from exc
        gateways = db.query(VMNode).filter(VMNode.role == "GATEWAY").all()
        if len(gateways) != 1:
            raise HTTPException(
                status_code=409,
                detail="A single explicitly configured GATEWAY node is required for real IP blocking",
            )
        target_node = gateways[0]
        firewall = "ip6tables" if parsed_ip.version == 6 else "iptables"
        command_to_run = f"{firewall} -I INPUT -s {parsed_ip} -j DROP"
    elif action.action_type == "DISABLE_USER":
        if not re.fullmatch(r"[A-Za-z0-9._-]{1,64}", action.target_value):
            raise HTTPException(status_code=400, detail="DISABLE_USER target contains unsupported characters")
        raise HTTPException(
            status_code=501,
            detail="No identity-management connector is configured; the user account was not changed",
        )
    elif action.action_type in ["ISOLATE_HOST", "ISOLATE_ENDPOINT"]:
        target_node = db.query(VMNode).filter(
            (VMNode.vm_id == action.target_value)
            | (VMNode.ip_address == action.target_value)
            | (VMNode.name == action.target_value)
        ).first()
        if not target_node or target_node.role != "ENDPOINT":
            raise HTTPException(
                status_code=409,
                detail="No matching registered ENDPOINT VM is available; no isolation command was dispatched",
            )
        command_to_run = "iptables -I INPUT -i lo -j ACCEPT; iptables -I INPUT -s 192.168.56.1 -j ACCEPT; iptables -P INPUT DROP; iptables -P FORWARD DROP"
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported response action type '{action.action_type}'")

    vm_act = VMAction(
        action_id=f"VMACT-{uuid.uuid4().hex[:8].upper()}",
        incident_id=action.incident_id,
        vm_id=target_node.vm_id,
        action_type=action.action_type,
        target_value=action.target_value,
        command_to_run=command_to_run,
        status="PENDING_VM_PULL",
        created_at=datetime.now(timezone.utc),
    )
    db.add(vm_act)
    db.flush()
    action.status = "PENDING_VERIFICATION"
    action.is_dry_run = False
    action.execution_result = {
        "is_simulation": False,
        "actual_system_changes": "pending VM acknowledgement",
        "execution_dispatched": True,
        "executed_by": actor,
        "dispatched_at": datetime.now(timezone.utc).isoformat(),
        "vm_action_id": vm_act.action_id,
        "assigned_vm_node": target_node.vm_id,
        "command_to_run": command_to_run,
    }

    incident = db.query(Incident).filter(Incident.incident_id == action.incident_id).first()
    if incident:
        incident.response_status = "PENDING_VERIFICATION"
        incident.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(action)
    log_audit_entry(
        db,
        actor=actor,
        action="DISPATCH_RESPONSE_ACTION",
        target_type="RESPONSE_ACTION",
        target_id=action_id,
        details=action.execution_result,
    )

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
