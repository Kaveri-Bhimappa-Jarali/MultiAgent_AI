import uuid
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.event import SecurityEvent
from app.schemas.event import SecurityEventCreate, IngestionResult
from app.services.event_queue import event_queue
from app.services.broadcaster import broadcaster

def generate_event_id(evt: SecurityEventCreate) -> str:
    if evt.event_id:
        return evt.event_id
    # Create deterministic fingerprint to prevent duplicate ingest
    raw_str = f"{evt.event_type}|{evt.source_ip}|{evt.destination_ip}|{evt.username}|{evt.host}|{evt.timestamp or ''}|{evt.command_line or ''}"
    digest = hashlib.sha256(raw_str.encode('utf-8')).hexdigest()[:12]
    return f"EVT-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{digest.upper()}"

def normalize_and_ingest_events(
    db: Session,
    raw_events: List[SecurityEventCreate],
    auto_queue: bool = True
) -> Tuple[IngestionResult, List[SecurityEvent]]:
    total = len(raw_events)
    accepted = 0
    duplicates = 0
    errors = 0
    saved_events: List[SecurityEvent] = []
    now = datetime.now(timezone.utc)

    for item in raw_events:
        try:
            event_id = generate_event_id(item)
            # Duplicate check
            existing = db.query(SecurityEvent).filter(SecurityEvent.event_id == event_id).first()
            if existing:
                duplicates += 1
                continue

            ts = item.timestamp or now
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)

            sec_event = SecurityEvent(
                event_id=event_id,
                timestamp=ts,
                ingested_at=now,
                source_type=item.source_type or "API",
                source_identifier=item.source_identifier,
                event_type=item.event_type.strip().lower(),
                severity=item.severity.upper(),
                source_ip=item.source_ip,
                destination_ip=item.destination_ip,
                source_port=item.source_port,
                destination_port=item.destination_port,
                protocol=item.protocol.upper() if item.protocol else None,
                username=item.username,
                host=item.host,
                process_name=item.process_name,
                process_path=item.process_path,
                command_line=item.command_line,
                file_path=item.file_path,
                file_action=item.file_action,
                detection_status="UNPROCESSED",
                processing_status="PENDING",
                correlation_id=item.correlation_id,
                is_simulated=item.is_simulated,
                raw_payload=item.raw_payload or str(item.model_dump()),
                created_at=now
            )
            db.add(sec_event)
            saved_events.append(sec_event)
            accepted += 1
        except Exception as e:
            errors += 1
            print(f"[IngestionService] Error parsing event: {e}")

    db.commit()

    # Broadcast newly ingested events immediately to all connected UI clients
    for e in saved_events:
        broadcaster.publish_sync("EVENT_INGESTED", {
            "id": e.id,
            "event_id": e.event_id,
            "timestamp": e.timestamp.isoformat(),
            "ingested_at": e.ingested_at.isoformat(),
            "source_type": e.source_type,
            "event_type": e.event_type,
            "severity": e.severity,
            "source_ip": e.source_ip,
            "destination_ip": e.destination_ip,
            "host": e.host,
            "username": e.username,
            "file_action": e.file_action,
            "command_line": e.command_line,
            "detection_status": e.detection_status,
            "processing_status": e.processing_status,
            "is_simulated": e.is_simulated
        })

    # Automatically queue events for real-time background processing
    if auto_queue and saved_events:
        event_queue.enqueue_events([e.event_id for e in saved_events])

    result = IngestionResult(
        total_received=total,
        accepted=accepted,
        duplicates_skipped=duplicates,
        errors=errors,
        queued_for_processing=len(saved_events) if auto_queue else 0,
        detections_triggered=0,
        incidents_updated=0
    )
    return result, saved_events
