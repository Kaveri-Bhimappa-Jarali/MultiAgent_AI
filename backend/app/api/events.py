from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import io
import json

from app.database import get_db
from app.models.event import SecurityEvent
from app.schemas.event import SecurityEventResponse, SecurityEventCreate, EventBatchIngest, IngestionResult
from app.services.ingestion_service import normalize_and_ingest_events

router = APIRouter(prefix="/events", tags=["Events"])

@router.get("")
def list_events(
    severity: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    source_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    is_simulated: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(SecurityEvent)

    if severity:
        query = query.filter(SecurityEvent.severity == severity.upper())
    if event_type:
        query = query.filter(SecurityEvent.event_type == event_type.lower())
    if source_type:
        query = query.filter(SecurityEvent.source_type == source_type.upper())
    if is_simulated is not None:
        query = query.filter(SecurityEvent.is_simulated == is_simulated)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (SecurityEvent.source_ip.ilike(pattern)) |
            (SecurityEvent.destination_ip.ilike(pattern)) |
            (SecurityEvent.username.ilike(pattern)) |
            (SecurityEvent.host.ilike(pattern)) |
            (SecurityEvent.command_line.ilike(pattern)) |
            (SecurityEvent.file_path.ilike(pattern)) |
            (SecurityEvent.event_id.ilike(pattern))
        )

    total = query.count()
    events = query.order_by(SecurityEvent.timestamp.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "events": [SecurityEventResponse.model_validate(e) for e in events]
    }

@router.get("/{event_id}", response_model=SecurityEventResponse)
def get_event(event_id: str, db: Session = Depends(get_db)):
    evt = db.query(SecurityEvent).filter(SecurityEvent.event_id == event_id).first()
    if not evt:
        raise HTTPException(status_code=404, detail="Event not found")
    return SecurityEventResponse.model_validate(evt)

@router.post("/ingest", response_model=IngestionResult)
def ingest_single_event(event: SecurityEventCreate, db: Session = Depends(get_db)):
    res, _ = normalize_and_ingest_events(db, [event])
    return res

@router.post("/import", response_model=IngestionResult)
def import_batch_events(payload: EventBatchIngest, db: Session = Depends(get_db)):
    res, _ = normalize_and_ingest_events(db, payload.events)
    return res

@router.get("/export/csv")
def export_events_csv(db: Session = Depends(get_db)):
    events = db.query(SecurityEvent).order_by(SecurityEvent.timestamp.desc()).limit(1000).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Event ID", "Timestamp", "Event Type", "Severity", "Source IP",
        "Dest IP", "Port", "Username", "Host", "Command Line", "Status"
    ])
    for e in events:
        writer.writerow([
            e.event_id,
            e.timestamp.isoformat() if e.timestamp else "",
            e.event_type,
            e.severity,
            e.source_ip or "",
            e.destination_ip or "",
            e.destination_port or "",
            e.username or "",
            e.host or "",
            e.command_line or "",
            e.detection_status
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=soc_events_export.csv"}
    )
