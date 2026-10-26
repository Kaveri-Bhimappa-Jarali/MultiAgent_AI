from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.response import ResponseAction, VerificationResult
from app.schemas.response import ResponseActionResponse, VerificationResultResponse
from app.services.response_service import approve_response_action, execute_response_action
from app.services.verification_service import create_and_run_verification

router = APIRouter(prefix="/responses", tags=["Responses"])

@router.get("", response_model=List[ResponseActionResponse])
def list_responses(
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(ResponseAction)
    if status:
        query = query.filter(ResponseAction.status == status.upper())
    actions = query.order_by(ResponseAction.created_at.desc()).limit(limit).all()
    return [ResponseActionResponse.model_validate(a) for a in actions]

@router.get("/verifications", response_model=List[VerificationResultResponse])
def list_verifications(limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)):
    results = db.query(VerificationResult).order_by(VerificationResult.verified_at.desc()).limit(limit).all()
    return [VerificationResultResponse.model_validate(v) for v in results]

@router.get("/{action_id}", response_model=ResponseActionResponse)
def get_response(action_id: str, db: Session = Depends(get_db)):
    action = db.query(ResponseAction).filter(ResponseAction.action_id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Response action not found")
    return ResponseActionResponse.model_validate(action)

@router.post("/{action_id}/approve", response_model=ResponseActionResponse)
def approve_action(
    action_id: str,
    approver: str = Body("Lead SOC Analyst", embed=True),
    db: Session = Depends(get_db)
):
    action = approve_response_action(db, action_id, approver)
    return ResponseActionResponse.model_validate(action)

@router.post("/{action_id}/execute", response_model=ResponseActionResponse)
def execute_action(
    action_id: str,
    actor: str = Body("SOC Operator", embed=True),
    dry_run: Optional[bool] = Body(None, embed=True),
    db: Session = Depends(get_db)
):
    action = execute_response_action(db, action_id, actor, dry_run)
    return ResponseActionResponse.model_validate(action)

@router.post("/{action_id}/verify", response_model=VerificationResultResponse)
def verify_action(action_id: str, db: Session = Depends(get_db)):
    action = db.query(ResponseAction).filter(ResponseAction.action_id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Response action not found")
    
    result = create_and_run_verification(db, action.action_id, action.incident_id)
    return VerificationResultResponse.model_validate(result)
