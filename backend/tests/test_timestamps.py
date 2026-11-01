from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.event import SecurityEvent
from app.schemas.event import SecurityEventCreate, SecurityEventResponse
from app.services.database_migrations import ensure_event_processed_at_column
from app.services.time_utils import ensure_utc, format_ist, utc_isoformat
from app.services import ingestion_service


def test_utc_timestamp_normalization_and_ist_format():
    utc_instant = datetime(2026, 11, 1, 11, 0, tzinfo=timezone.utc)
    kolkata_instant = utc_instant.astimezone(timezone(timedelta(hours=5, minutes=30)))

    assert ensure_utc(kolkata_instant) == utc_instant
    assert utc_isoformat(kolkata_instant) == "2026-11-01T11:00:00+00:00"
    assert format_ist(utc_instant) == "01 Nov 2026, 04:30:00 PM IST"


def test_event_schema_normalizes_offset_and_legacy_database_timestamps():
    event_time = datetime(2026, 11, 1, 16, 30, tzinfo=timezone(timedelta(hours=5, minutes=30)))
    create = SecurityEventCreate(event_type="network_connection", timestamp=event_time)
    assert create.timestamp == datetime(2026, 11, 1, 11, 0, tzinfo=timezone.utc)

    engine = create_engine("sqlite://", poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine)
    with session_factory() as db:
        db.add(SecurityEvent(
            event_id="UTC-ROUNDTRIP-1",
            timestamp=event_time,
            ingested_at=datetime(2026, 11, 1, 11, 1, tzinfo=timezone.utc),
            event_type="network_connection",
            severity="INFO",
        ))
        db.commit()
        stored = db.query(SecurityEvent).filter_by(event_id="UTC-ROUNDTRIP-1").one()
        response = SecurityEventResponse.model_validate(stored)
        raw_timestamp = db.execute(
            text("SELECT timestamp FROM security_events WHERE event_id = 'UTC-ROUNDTRIP-1'")
        ).scalar_one()

    assert response.timestamp == datetime(2026, 11, 1, 11, 0, tzinfo=timezone.utc)
    assert response.timestamp.isoformat() == "2026-11-01T11:00:00+00:00"
    assert raw_timestamp == "2026-11-01 11:00:00.000000"
    assert response.processed_at is None
    engine.dispose()


def test_ingestion_preserves_occurrence_and_broadcasts_utc_timestamps(monkeypatch):
    engine = create_engine("sqlite://", poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine)
    broadcasts = []
    monkeypatch.setattr(ingestion_service.event_queue, "enqueue_events", lambda ids: None)
    monkeypatch.setattr(
        ingestion_service.broadcaster,
        "publish_sync",
        lambda event_type, data: broadcasts.append((event_type, data)),
    )
    occurrence = datetime(2026, 11, 1, 16, 30, tzinfo=timezone(timedelta(hours=5, minutes=30)))

    with session_factory() as db:
        result, saved = ingestion_service.normalize_and_ingest_events(db, [
            SecurityEventCreate(
                event_id="UTC-INGEST-1",
                event_type="network_connection",
                timestamp=occurrence,
            )
        ])
        assert result.accepted == 1
        assert len(saved) == 1
        event = db.query(SecurityEvent).filter_by(event_id="UTC-INGEST-1").one()
        assert event.timestamp == datetime(2026, 11, 1, 11, 0, tzinfo=timezone.utc)
        assert event.ingested_at.tzinfo == timezone.utc
        assert event.created_at.tzinfo == timezone.utc

    event_type, data = broadcasts[0]
    assert event_type == "EVENT_INGESTED"
    assert data["timestamp"] == "2026-11-01T11:00:00+00:00"
    assert data["ingested_at"].endswith("+00:00")
    assert data["processed_at"] is None
    engine.dispose()


def test_existing_event_migration_preserves_historical_timestamp():
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        connection.execute(text(
            "CREATE TABLE security_events (event_id VARCHAR(64), timestamp DATETIME NOT NULL)"
        ))
        connection.execute(text(
            "INSERT INTO security_events (event_id, timestamp) VALUES "
            "('HISTORICAL-1', '2026-11-01 11:00:00')"
        ))

    ensure_event_processed_at_column(engine)
    ensure_event_processed_at_column(engine)

    with engine.connect() as connection:
        row = connection.execute(text(
            "SELECT timestamp, processed_at FROM security_events WHERE event_id = 'HISTORICAL-1'"
        )).one()
    assert row.timestamp == "2026-11-01 11:00:00"
    assert row.processed_at is None
    engine.dispose()


def test_queue_processing_persists_distinct_processing_time(monkeypatch):
    from app.services import event_queue as queue_module

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine)
    monkeypatch.setattr(queue_module, "SessionLocal", session_factory)
    monkeypatch.setattr(queue_module, "evaluate_event_with_rolling_window", lambda db, event: [])

    class NoopOrchestrator:
        def __init__(self, db):
            pass

        def dispatch_event_driven_pipeline(self, event, findings):
            return {"agents_executed": 0}

    monkeypatch.setattr(queue_module, "MultiAgentSOCEngine", NoopOrchestrator)
    broadcasts = []
    monkeypatch.setattr(
        queue_module.broadcaster,
        "publish_sync",
        lambda event_type, data: broadcasts.append((event_type, data)),
    )
    queue = queue_module.RealtimeEventQueue()

    with session_factory() as db:
        db.add(SecurityEvent(
            event_id="PROCESS-TIMESTAMP-1",
            timestamp=datetime(2026, 11, 1, 11, 0, tzinfo=timezone.utc),
            ingested_at=datetime(2026, 11, 1, 11, 1, tzinfo=timezone.utc),
            event_type="network_connection",
            severity="INFO",
        ))
        db.commit()

    queue._process_single_event_sync("PROCESS-TIMESTAMP-1")

    with session_factory() as db:
        event = db.query(SecurityEvent).filter_by(event_id="PROCESS-TIMESTAMP-1").one()
        assert event.processing_status == "PROCESSED"
        assert event.timestamp == datetime(2026, 11, 1, 11, 0, tzinfo=timezone.utc)
        assert event.ingested_at == datetime(2026, 11, 1, 11, 1, tzinfo=timezone.utc)
        assert event.processed_at is not None
        assert event.processed_at.replace(tzinfo=timezone.utc) >= event.ingested_at.replace(tzinfo=timezone.utc)

    processed_type, processed_data = next(item for item in broadcasts if item[0] == "EVENT_PROCESSED")
    assert processed_type == "EVENT_PROCESSED"
    assert processed_data["timestamp"] == "2026-11-01T11:00:00+00:00"
    assert processed_data["ingested_at"] == "2026-11-01T11:01:00+00:00"
    assert processed_data["processed_at"].endswith("+00:00")
    engine.dispose()
