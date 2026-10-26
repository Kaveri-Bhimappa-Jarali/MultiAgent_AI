import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.response import ResponseAction
from app.models.incident import Incident, IncidentAudit
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

    # Execute inside isolated sandbox containment environment
    execution_details = {
        "sandbox_environment": "Enterprise_Isolated_Lab_VPC",
        "is_dry_run": effective_dry_run,
        "executed_by": actor,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    if action.action_type == "BLOCK_IP":
        execution_details.update({
            "firewall_vendor": "Simulated Perimeter PaloAlto/Iptables Gateway",
            "rule_id": f"FW-DROP-{uuid.uuid4().hex[:6].upper()}",
            "command_applied": f"iptables -I INPUT -s {action.target_value} -j DROP; nft add rule inet filter input ip saddr {action.target_value} drop",
            "effect": f"All ingress & egress packets to/from {action.target_value} dropped with zero acknowledgment."
        })
    elif action.action_type == "DISABLE_USER":
        execution_details.update({
            "identity_provider": "Simulated Active Directory / Okta Directory",
            "directory_dn": f"CN={action.target_value},OU=Staff,DC=enterprise,DC=local",
            "command_applied": f"Set-ADUser -Identity '{action.target_value}' -Enabled $false; Revoke-SPSessionSecurityToken",
            "effect": f"Identity '{action.target_value}' locked out, Kerberos TGT tickets cleared, active SSO sessions revoked."
        })
    elif action.action_type == "ISOLATE_ENDPOINT":
        execution_details.update({
            "edr_platform": "Simulated CrowdStrike Falcon / Microsoft Defender for Endpoint",
            "agent_id": f"EDR-AGENT-{uuid.uuid4().hex[:8].upper()}",
            "action_applied": f"IsolateHostNetwork(host='{action.target_value}', allow_soc_telemetry=True)",
            "effect": f"Host '{action.target_value}' completely isolated from LAN; only TLS tunnel to SOC remains active."
        })
    else:
        execution_details.update({
            "generic_action": action.action_type,
            "target": action.target_value,
            "effect": "Executed administrative containment procedure in isolated sandbox."
        })

    action.status = "EXECUTED"
    action.is_dry_run = effective_dry_run
    action.execution_result = execution_details
    action.executed_at = datetime.now(timezone.utc)

    # Update parent incident status to CONTAINED
    incident = db.query(Incident).filter(Incident.incident_id == action.incident_id).first()
    if incident:
        prev_status = incident.status
        incident.status = "CONTAINED"
        incident.response_status = "EXECUTED"
        incident.updated_at = datetime.now(timezone.utc)
        
        # Add audit
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

    # Trigger response verification automatically
    from app.services.verification_service import create_and_run_verification
    create_and_run_verification(db, action.action_id, action.incident_id)

    return action
