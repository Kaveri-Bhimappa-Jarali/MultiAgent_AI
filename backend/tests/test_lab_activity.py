from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base
from app.models.event import SecurityEvent
from app.services.lab_activity_service import get_lab_activity


def test_lab_counts_real_events_by_received_time_and_bucket():
    engine = create_engine('sqlite://')
    Base.metadata.create_all(engine)
    now = datetime.now(timezone.utc)
    start = now - timedelta(hours=1)

    def event(number, received, identifier='vm-endpoint-01:nginx_access.log', simulated=False):
        return SecurityEvent(
            event_id=f'LAB-{number}', event_type='network_connection', severity='HIGH',
            # Old occurrence time must not exclude a newly received buffered event.
            timestamp=now - timedelta(days=3), ingested_at=received,
            source_identifier=identifier, is_simulated=simulated,
        )

    with Session(engine) as db:
        db.add_all([
            event(1, start),
            event(2, start + timedelta(minutes=5), 'vm-attacker-01:socket_tracker'),
            event(3, now - timedelta(microseconds=1)),
            event(4, now),  # upper boundary is exclusive
            event(5, start - timedelta(microseconds=1)),
            event(6, now - timedelta(minutes=2), simulated=True),
            event(7, now - timedelta(minutes=2), 'vm-server-01:nginx_access.log'),
            event(8, now - timedelta(minutes=2), 'api:nginx_access.log'),
        ])
        db.commit()
        result = get_lab_activity(db, minutes=60, now=now)
    assert result['total_events'] == 3
    assert result['http_events'] == 2
    assert result['high_severity_events'] == 3
    assert result['buckets'][0]['victim'] == 1
    assert result['buckets'][1]['attacker'] == 1
    assert result['buckets'][11]['victim'] == 1
    assert sum(n['window_events'] for n in result['nodes']) == 3
    assert sum(c['count'] for c in result['categories']) == 3
    engine.dispose()


def test_empty_window_returns_zeroes_without_sample_values():
    engine = create_engine('sqlite://')
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        result = get_lab_activity(db, minutes=15)
    assert result['total_events'] == 0
    assert len(result['buckets']) == 12
    assert all(b['attacker'] == b['victim'] == 0 for b in result['buckets'])
    assert all(n['status'] == 'CONFIGURED' for n in result['nodes'])
    engine.dispose()
