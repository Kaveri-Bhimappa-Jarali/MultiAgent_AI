from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

from app.database import get_db
from app.models.threat_intel import ThreatIndicator
from app.schemas.threat_intel import (
    ThreatLookupRequest,
    ThreatLookupResponse,
    ThreatIndicatorResponse,
    ThreatIndicatorCreate
)
from app.services.threat_intel_service import lookup_indicator

router = APIRouter(prefix="/intelligence", tags=["Threat Intelligence"])

@router.post("/lookup", response_model=ThreatLookupResponse)
def lookup_threat(req: ThreatLookupRequest, db: Session = Depends(get_db)):
    return lookup_indicator(db, req.indicator)

@router.get("/indicators", response_model=List[ThreatIndicatorResponse])
def list_indicators(limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)):
    indicators = db.query(ThreatIndicator).order_by(ThreatIndicator.last_seen.desc()).limit(limit).all()
    return [ThreatIndicatorResponse.model_validate(i) for i in indicators]

@router.post("/indicators", response_model=ThreatIndicatorResponse)
def create_or_update_indicator(req: ThreatIndicatorCreate, db: Session = Depends(get_db)):
    cleaned = req.indicator_value.strip()
    match = db.query(ThreatIndicator).filter(ThreatIndicator.indicator_value == cleaned).first()
    now = datetime.now(timezone.utc)
    if match:
        match.threat_name = req.threat_name
        match.threat_actor = req.threat_actor
        match.confidence = req.confidence
        match.severity = req.severity
        match.tags = req.tags
        match.description = req.description
        match.last_seen = now
    else:
        match = ThreatIndicator(
            indicator_type=req.indicator_type.upper(),
            indicator_value=cleaned,
            threat_name=req.threat_name,
            threat_actor=req.threat_actor,
            confidence=req.confidence,
            severity=req.severity,
            tags=req.tags,
            description=req.description,
            first_seen=now,
            last_seen=now
        )
        db.add(match)
    db.commit()
    db.refresh(match)
    return ThreatIndicatorResponse.model_validate(match)
