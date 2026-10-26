from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models.detection import DetectionRule, DetectionFinding
from app.models.event import SecurityEvent
from app.schemas.detection import DetectionRuleResponse, DetectionRuleCreate, DetectionRuleUpdate, DetectionFindingResponse
from app.services.detection_service import evaluate_events_against_rules

router = APIRouter(prefix="/detections", tags=["Detections"])

@router.get("", response_model=List[DetectionFindingResponse])
def list_findings(
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(DetectionFinding)
    if severity:
        query = query.filter(DetectionFinding.severity == severity.upper())
    findings = query.order_by(DetectionFinding.timestamp.desc()).limit(limit).all()
    return [DetectionFindingResponse.model_validate(f) for f in findings]

@router.get("/rules", response_model=List[DetectionRuleResponse])
def list_rules(db: Session = Depends(get_db)):
    rules = db.query(DetectionRule).order_by(DetectionRule.category).all()
    return [DetectionRuleResponse.model_validate(r) for r in rules]

@router.put("/rules/{rule_id}", response_model=DetectionRuleResponse)
def update_rule(rule_id: str, updates: DetectionRuleUpdate, db: Session = Depends(get_db)):
    rule = db.query(DetectionRule).filter(DetectionRule.rule_id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    if updates.enabled is not None:
        rule.enabled = updates.enabled
    if updates.threshold is not None:
        rule.threshold = updates.threshold
    if updates.severity is not None:
        rule.severity = updates.severity
    if updates.name is not None:
        rule.name = updates.name
    if updates.description is not None:
        rule.description = updates.description

    db.commit()
    return DetectionRuleResponse.model_validate(rule)

@router.post("/evaluate")
def trigger_evaluation(db: Session = Depends(get_db)):
    unprocessed = db.query(SecurityEvent).filter(SecurityEvent.detection_status == "UNPROCESSED").all()
    findings = evaluate_events_against_rules(db, unprocessed)
    for e in unprocessed:
        e.detection_status = "ANALYZED"
    db.commit()
    return {
        "events_evaluated": len(unprocessed),
        "new_findings_generated": len(findings)
    }
