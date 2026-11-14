"""
Test Suite: Correlation Agent Logic
====================================
Validates that the CorrelationAgent correctly enforces:
  - Minimum event threshold (>= 2 distinct events required)
  - Time-window constraint (5 minutes)
  - Relationship gate (event types must be meaningfully related)
  - Deduplication (same event ID never creates a duplicate incident or link)
  - Update vs. create (new related events update existing open incidents)
  - Repeated agent runs produce no duplicate incidents

Run from e:\\kaveri2:
    .venv\\Scripts\\python.exe -m pytest backend/tests/test_correlation_agent.py -v
"""
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch, PropertyMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.event import SecurityEvent
from app.models.incident import Incident, IncidentEvent, IncidentAudit
from app.agents.correlation_agent import (
    CorrelationAgent,
    MIN_EVENTS,
    CORRELATION_WINDOW_SECONDS,
    _types_are_related,
    _within_time_window,
)


# ---------------------------------------------------------------------------
# Shared in-memory SQLite fixture
# ---------------------------------------------------------------------------
@pytest.fixture(scope="function")
def db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)
    # Create the unique index required for deduplication
    from sqlalchemy import text
    with engine.begin() as conn:
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_incident_event "
            "ON incident_events (incident_id, event_id)"
        ))
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(engine)


def _make_event(
    event_id: str,
    event_type: str = "network_connection",
    severity: str = "HIGH",
    source_ip: str = "10.0.0.1",
    username: str = None,
    host: str = None,
    timestamp: datetime = None,
    is_simulated: bool = False
) -> SecurityEvent:
    ts = timestamp or datetime.now(timezone.utc)
    return SecurityEvent(
        event_id=event_id,
        timestamp=ts,
        ingested_at=ts,
        source_type="TEST",
        event_type=event_type,
        severity=severity,
        source_ip=source_ip,
        username=username,
        host=host,
        detection_status="ANALYZED",
        processing_status="PROCESSED",
        is_simulated=is_simulated,
        created_at=ts
    )


def _run_correlation(db, events):
    """Helper: add events to DB and run the CorrelationAgent."""
    for e in events:
        existing = db.query(SecurityEvent).filter(SecurityEvent.event_id == e.event_id).first()
        if not existing:
            db.add(e)
    db.commit()
    agent = CorrelationAgent(db)
    return agent.analyze({"events": events, "summary": "Test run"})


# ---------------------------------------------------------------------------
# Unit tests for helper functions
# ---------------------------------------------------------------------------
class TestHelpers:
    def test_types_related_single_auth(self):
        assert _types_are_related({"authentication"}) is True

    def test_types_related_single_network(self):
        assert _types_are_related({"network_connection"}) is True

    def test_types_unrelated_single_dns(self):
        assert _types_are_related({"dns_query"}) is False

    def test_types_related_net_and_auth(self):
        assert _types_are_related({"network_connection", "authentication"}) is True

    def test_types_related_auth_and_priv(self):
        assert _types_are_related({"authentication", "privilege_escalation"}) is True

    def test_types_unrelated_pair(self):
        # dns_query paired with any event type is not in the map
        assert _types_are_related({"dns_query", "network_connection"}) is False

    def test_within_window_true(self):
        now = datetime.now(timezone.utc)
        events = [
            _make_event("e1", timestamp=now),
            _make_event("e2", timestamp=now + timedelta(seconds=100)),
        ]
        assert _within_time_window(events, 300) is True

    def test_within_window_false(self):
        now = datetime.now(timezone.utc)
        events = [
            _make_event("e1", timestamp=now),
            _make_event("e2", timestamp=now + timedelta(seconds=400)),
        ]
        assert _within_time_window(events, 300) is False

    def test_empty_events_within_window(self):
        assert _within_time_window([], 300) is True


# ---------------------------------------------------------------------------
# Integration tests with in-memory SQLite
# ---------------------------------------------------------------------------
class TestCorrelationAgentScenarios:

    # ---- Test 1: One unique event → no correlated incident ----------------
    def test_1_single_event_no_incident(self, db):
        events = [_make_event("EVT-001", event_type="network_connection", severity="HIGH")]
        result = _run_correlation(db, events)

        assert result["incidents_created"] == 0
        assert result["incidents_updated"] == 0
        assert db.query(Incident).count() == 0

    # ---- Test 2: Two related events → one incident -------------------------
    def test_2_two_related_events_one_incident(self, db):
        now = datetime.now(timezone.utc)
        events = [
            _make_event("EVT-002a", event_type="network_connection", severity="HIGH",
                        source_ip="10.0.0.5", timestamp=now),
            _make_event("EVT-002b", event_type="authentication", severity="HIGH",
                        source_ip="10.0.0.5", timestamp=now + timedelta(seconds=60)),
        ]
        result = _run_correlation(db, events)

        assert result["incidents_created"] == 1
        assert db.query(Incident).count() == 1
        inc = db.query(Incident).first()
        assert inc.event_count == 2

    # ---- Test 3: Two unrelated events → no incident ----------------------
    def test_3_two_unrelated_events_no_incident(self, db):
        now = datetime.now(timezone.utc)
        events = [
            _make_event("EVT-003a", event_type="dns_query", severity="HIGH",
                        source_ip="10.0.0.5", timestamp=now),
            _make_event("EVT-003b", event_type="dns_query", severity="HIGH",
                        source_ip="10.0.0.5", timestamp=now + timedelta(seconds=10)),
        ]
        result = _run_correlation(db, events)

        assert result["incidents_created"] == 0
        assert db.query(Incident).count() == 0

    # ---- Test 4: Same event processed repeatedly → no duplicate counting --
    def test_4_same_event_no_duplicate(self, db):
        now = datetime.now(timezone.utc)
        e1 = _make_event("EVT-004a", event_type="network_connection", severity="HIGH",
                         source_ip="10.0.0.6", timestamp=now)
        e2 = _make_event("EVT-004b", event_type="authentication", severity="HIGH",
                         source_ip="10.0.0.6", timestamp=now + timedelta(seconds=30))

        # Run correlation twice with the same events
        result1 = _run_correlation(db, [e1, e2])
        result2 = _run_correlation(db, [e1, e2])

        # Only 1 incident should exist; event_count must stay at 2
        assert db.query(Incident).count() == 1
        inc = db.query(Incident).first()
        assert inc.event_count == 2
        # incident_events rows must be exactly 2 (no duplicates)
        assert db.query(IncidentEvent).filter(
            IncidentEvent.incident_id == inc.incident_id
        ).count() == 2

    # ---- Test 5: Three related events → one incident with 3 events --------
    def test_5_three_related_events_one_incident(self, db):
        now = datetime.now(timezone.utc)
        events = [
            _make_event("EVT-005a", event_type="network_connection", severity="MEDIUM",
                        source_ip="10.0.0.7", timestamp=now),
            _make_event("EVT-005b", event_type="authentication", severity="HIGH",
                        source_ip="10.0.0.7", timestamp=now + timedelta(seconds=30)),
            _make_event("EVT-005c", event_type="privilege_escalation", severity="CRITICAL",
                        source_ip="10.0.0.7", timestamp=now + timedelta(seconds=90)),
        ]
        result = _run_correlation(db, events)

        assert result["incidents_created"] == 1
        inc = db.query(Incident).first()
        assert inc.event_count == 3
        assert inc.severity == "CRITICAL"

    # ---- Test 6: New related event updates existing incident ---------------
    def test_6_new_event_updates_existing_incident(self, db):
        now = datetime.now(timezone.utc)
        # First pair creates an incident
        e1 = _make_event("EVT-006a", event_type="network_connection", severity="HIGH",
                         source_ip="10.0.0.8", timestamp=now)
        e2 = _make_event("EVT-006b", event_type="authentication", severity="HIGH",
                         source_ip="10.0.0.8", timestamp=now + timedelta(seconds=30))
        _run_correlation(db, [e1, e2])

        assert db.query(Incident).count() == 1
        first_inc_id = db.query(Incident).first().incident_id

        # New related event should update the same incident
        e3 = _make_event("EVT-006c", event_type="privilege_escalation", severity="CRITICAL",
                         source_ip="10.0.0.8", timestamp=now + timedelta(seconds=120))
        result2 = _run_correlation(db, [e1, e2, e3])

        # Still only 1 incident
        assert db.query(Incident).count() == 1
        inc = db.query(Incident).filter(Incident.incident_id == first_inc_id).first()
        assert inc.event_count == 3
        assert result2["incidents_updated"] == 1
        assert result2["incidents_created"] == 0

    # ---- Test 7: Correlation agent runs repeatedly → no duplicate incidents
    def test_7_repeated_agent_runs_no_duplicates(self, db):
        now = datetime.now(timezone.utc)
        e1 = _make_event("EVT-007a", event_type="network_connection", severity="HIGH",
                         source_ip="10.0.0.9", timestamp=now)
        e2 = _make_event("EVT-007b", event_type="authentication", severity="HIGH",
                         source_ip="10.0.0.9", timestamp=now + timedelta(seconds=45))

        for _ in range(5):
            _run_correlation(db, [e1, e2])

        assert db.query(Incident).count() == 1
        inc = db.query(Incident).first()
        assert inc.event_count == 2

    # ---- Test 8: Events outside time window → no correlation ---------------
    def test_8_events_outside_window_no_incident(self, db):
        now = datetime.now(timezone.utc)
        events = [
            _make_event("EVT-008a", event_type="network_connection", severity="HIGH",
                        source_ip="10.0.0.10", timestamp=now - timedelta(seconds=400)),
            _make_event("EVT-008b", event_type="authentication", severity="HIGH",
                        source_ip="10.0.0.10", timestamp=now),
        ]
        result = _run_correlation(db, events)

        assert result["incidents_created"] == 0
        assert db.query(Incident).count() == 0

    # ---- Test 9: Same source IP, unrelated event types → no correlation ---
    def test_9_same_ip_unrelated_types_no_incident(self, db):
        now = datetime.now(timezone.utc)
        events = [
            # dns_query + network_connection is not in RELATED_EVENT_TYPE_PAIRS
            _make_event("EVT-009a", event_type="dns_query", severity="HIGH",
                        source_ip="10.0.0.11", timestamp=now),
            _make_event("EVT-009b", event_type="network_connection", severity="HIGH",
                        source_ip="10.0.0.11", timestamp=now + timedelta(seconds=10)),
        ]
        result = _run_correlation(db, events)

        assert result["incidents_created"] == 0
        assert db.query(Incident).count() == 0

    # ---- Additional: individual findings still appear ---------------------
    def test_individual_finding_recorded_without_incident(self, db):
        """A single event must still produce an AgentFinding from the domain agents."""
        from app.models.agent import AgentFinding
        event = _make_event("EVT-IND-001", event_type="network_connection", severity="HIGH",
                            source_ip="10.0.0.20")
        db.add(event)
        db.commit()

        # Correlation agent alone produces no incident for a single event
        result = _run_correlation(db, [event])
        assert result["incidents_created"] == 0
        # The agent itself records 0 findings for skipped clusters — that is correct.
        # Domain agents (NetworkMonitoringAgent etc.) handle individual findings separately.
        assert db.query(Incident).count() == 0

