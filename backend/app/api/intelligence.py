from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.threat_intel import ThreatIndicator
from app.schemas.threat_intel import ThreatLookupRequest, ThreatLookupResponse, ThreatIndicatorResponse
from app.services.threat_intel_service import lookup_indicator

router = APIRouter(prefix="/intelligence", tags=["Threat Intelligence"])

@router.post("/lookup", response_model=ThreatLookupResponse)
def lookup_threat(req: ThreatLookupRequest, db: Session = Depends(get_db)):
    return lookup_indicator(db, req.indicator)

@router.get("/indicators", response_model=List[ThreatIndicatorResponse])
def list_indicators(limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)):
    indicators = db.query(ThreatIndicator).order_by(ThreatIndicator.last_seen.desc()).limit(limit).all()
    return [ThreatIndicatorResponse.model_validate(i) for i in indicators]
