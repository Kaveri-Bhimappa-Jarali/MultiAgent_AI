from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.response import ResponseAction, VerificationResult
from app.models.user import User
from app.schemas.response import ResponseActionResponse, VerificationResultResponse
from app.services.auth_service import get_current_user
from app.services.audit_service import log_audit_entry
from app.services.response_service import (
    approve_response_action,
    execute_response_action,
    simulate_response_action,
)
from app.services.verification_service import create_and_run_verification

router = APIRouter(prefix="/responses", tags=["Responses"])


def _require_soc_admin(user: User, db: Session, action_id: str, operation: str) -> None:
    if user.role != "SOC Admin":
        log_audit_entry(
            db,
            actor=user.username,
            action=f"{operation}_DENIED",
            target_type="RESPONSE_ACTION",
            target_id=action_id,
            details={"role": user.role},
            status="FAILED",
        )
        raise HTTPException(status_code=403, detail="SOC Admin role is required for this operation")


@router.get("", response_model=List[ResponseActionResponse])
def list_responses(
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(ResponseAction)
    if status:
        query = query.filter(ResponseAction.status == status.upper())
    actions = query.order_by(ResponseAction.created_at.desc()).limit(limit).all()
    return [ResponseActionResponse.model_validate(a) for a in actions]

@router.get("/verifications", response_model=List[VerificationResultResponse])
def list_verifications(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = db.query(VerificationResult).order_by(VerificationResult.verified_at.desc()).limit(limit).all()
    return [VerificationResultResponse.model_validate(v) for v in results]

@router.get("/{action_id}", response_model=ResponseActionResponse)
def get_response(
    action_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    action = db.query(ResponseAction).filter(ResponseAction.action_id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Response action not found")
    return ResponseActionResponse.model_validate(action)

@router.post("/{action_id}/approve", response_model=ResponseActionResponse)
def approve_action(
    action_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_soc_admin(current_user, db, action_id, "APPROVE_RESPONSE_ACTION")
    action = approve_response_action(db, action_id, current_user.username)
    return ResponseActionResponse.model_validate(action)


@router.post("/{action_id}/simulate", response_model=ResponseActionResponse)
def simulate_action(
    action_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    action = simulate_response_action(db, action_id, current_user.username)
    return ResponseActionResponse.model_validate(action)


@router.post("/{action_id}/execute", response_model=ResponseActionResponse)
def execute_action(
    action_id: str,
    dry_run: bool = Body(True, embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not dry_run:
        _require_soc_admin(current_user, db, action_id, "EXECUTE_RESPONSE_ACTION")
    action = execute_response_action(db, action_id, current_user.username, dry_run)
    return ResponseActionResponse.model_validate(action)


@router.post("/{action_id}/verify", response_model=VerificationResultResponse)
def verify_action(
    action_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    action = db.query(ResponseAction).filter(ResponseAction.action_id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Response action not found")
    _require_soc_admin(current_user, db, action_id, "VERIFY_RESPONSE_ACTION")
    if action.status not in {"EXECUTED", "PENDING_VERIFICATION", "SIMULATED"}:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot verify response action currently in '{action.status}' state",
        )

    result = create_and_run_verification(db, action.action_id, action.incident_id)
    return VerificationResultResponse.model_validate(result)


@router.post("/{action_id}/allow", response_model=ResponseActionResponse)
def allow_action(
    action_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Analyst Gate: Allows and executes the pending containment action."""
    action = db.query(ResponseAction).filter(ResponseAction.action_id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Response action not found")
    
    _require_soc_admin(current_user, db, action_id, "ALLOW_RESPONSE_ACTION")
    
    from datetime import datetime, timezone
    action.status = "EXECUTED"
    action.requires_approval = False
    action.approved_by = current_user.username
    action.approved_at = datetime.now(timezone.utc)
    action.is_dry_run = False
    action.execution_result = {
        "status": "EXECUTED",
        "authorized_by": current_user.username,
        "authorized_at": datetime.now(timezone.utc).isoformat(),
        "decision": "ALLOWED",
        "action_type": action.action_type,
        "target_value": action.target_value
    }
    db.commit()
    db.refresh(action)

    log_audit_entry(
        db,
        actor=current_user.username,
        action="ALLOW_RESPONSE_ACTION",
        target_type="RESPONSE_ACTION",
        target_id=action_id,
        details={"decision": "ALLOWED", "target": action.target_value}
    )

    from app.services.broadcaster import broadcaster
    broadcaster.publish_sync("RESPONSE_ACTION_UPDATED", {
        "action_id": action.action_id,
        "status": "EXECUTED",
        "decision": "ALLOWED",
        "actor": current_user.username
    })

    return ResponseActionResponse.model_validate(action)


@router.post("/{action_id}/deny", response_model=ResponseActionResponse)
def deny_action(
    action_id: str,
    reason: str = Body("Analyst denied containment", embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Analyst Gate: Denies and dismisses the containment action."""
    action = db.query(ResponseAction).filter(ResponseAction.action_id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Response action not found")
    
    _require_soc_admin(current_user, db, action_id, "DENY_RESPONSE_ACTION")
    
    from datetime import datetime, timezone
    action.status = "DISMISSED"
    action.requires_approval = False
    action.execution_result = {
        "status": "DISMISSED",
        "denied_by": current_user.username,
        "denied_at": datetime.now(timezone.utc).isoformat(),
        "reason": reason,
        "decision": "DENIED"
    }
    db.commit()
    db.refresh(action)

    log_audit_entry(
        db,
        actor=current_user.username,
        action="DENY_RESPONSE_ACTION",
        target_type="RESPONSE_ACTION",
        target_id=action_id,
        details={"decision": "DENIED", "reason": reason}
    )

    from app.services.broadcaster import broadcaster
    broadcaster.publish_sync("RESPONSE_ACTION_UPDATED", {
        "action_id": action.action_id,
        "status": "DISMISSED",
        "decision": "DENIED",
        "actor": current_user.username
    })

    return ResponseActionResponse.model_validate(action)

