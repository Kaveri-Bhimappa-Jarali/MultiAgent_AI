import asyncio
from datetime import timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.event import SecurityEvent
from app.services import ingestion_service
from app.services.broadcaster import BroadcasterService
from app.services.collectors import live_demo_stream_collector as stream_module
from app.services.collectors import collector_manager as collector_manager_module
from app.api.health_monitor import control_demo_stream
from app.api.demo import trigger_scenario


@pytest.fixture
def stream_db(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    monkeypatch.setattr(stream_module, "SessionLocal", session_factory)
    queued_ids = []
    monkeypatch.setattr(
        ingestion_service.event_queue,
        "enqueue_events",
        lambda event_ids: queued_ids.extend(event_ids),
    )
    yield session_factory, queued_ids
    engine.dispose()


@pytest.mark.parametrize(
    "scenario",
    ["scenario_1", "scenario_2", "scenario_3", "scenario_4", "normal_enterprise"],
)
def test_stream_scenarios_persist_normalized_events_and_enqueue(
    stream_db, scenario
):
    session_factory, queued_ids = stream_db
    collector = stream_module.LiveDemoStreamCollector()
    collector.is_running = True

    async def run_one_event():
        await collector.start_stream(scenario=scenario, rate=4.0)
        try:
            for _ in range(100):
                if collector.total_received:
                    break
                await asyncio.sleep(0.01)
            assert collector.total_received == 1
            assert collector.stream_state == "STREAMING"
        finally:
            await collector.stop_stream()

    asyncio.run(run_one_event())

    with session_factory() as db:
        event = db.query(SecurityEvent).one()
        assert event.event_id == queued_ids[0]
        assert event.source_type == "DEMO_STREAM"
        assert event.source_identifier == f"scenario:{scenario}"
        assert event.is_simulated is True
        assert event.processing_status == "PENDING"
        assert event.event_type in {
            "authentication",
            "network_connection",
            "privilege_escalation",
            "file_access",
            "process_execution",
        }


def test_stream_pause_resume_stop_and_duplicate_start(stream_db):
    session_factory, queued_ids = stream_db
    collector = stream_module.LiveDemoStreamCollector()
    collector.is_running = True

    async def exercise_controls():
        await collector.start_stream(scenario="scenario_1", rate=4.0)
        with pytest.raises(RuntimeError, match="already active"):
            await collector.start_stream(scenario="scenario_2", rate=4.0)

        for _ in range(100):
            if collector.total_received:
                break
            await asyncio.sleep(0.01)
        assert collector.total_received == 1

        await collector.pause_stream()
        assert collector.get_status()["stream_state"] == "PAUSED"
        await asyncio.sleep(0.3)
        assert collector.total_received == 1

        await collector.resume_stream()
        assert collector.get_status()["stream_state"] == "STREAMING"
        for _ in range(100):
            if collector.total_received > 1:
                break
            await asyncio.sleep(0.01)
        assert collector.total_received > 1

        await collector.stop_stream()
        assert collector.get_status()["stream_state"] == "STOPPED"
        stopped_count = collector.total_received
        await asyncio.sleep(0.3)
        assert collector.total_received == stopped_count
        assert collector.stream_task is None

    asyncio.run(exercise_controls())
    assert len(queued_ids) == collector.total_received
    with session_factory() as db:
        assert db.query(SecurityEvent).count() == collector.total_received


@pytest.mark.parametrize(
    ("scenario_runner", "expected_events", "scenario_id"),
    [
        (1, 5, "scenario_1"),
        (2, 14, "scenario_2"),
        (3, 4, "scenario_3"),
        (4, 3, "scenario_4"),
    ],
)
def test_one_shot_scenarios_enqueue_persisted_security_events(
    stream_db, scenario_runner, expected_events, scenario_id
):
    session_factory, queued_ids = stream_db
    with session_factory() as db:
        result = trigger_scenario(scenario_runner, db)

        assert result["events_generated"] == expected_events
        assert result["events_queued"] == expected_events
        assert result["ingestion"]["accepted"] == expected_events
        assert result["ingestion"]["errors"] == 0
        assert len(result["event_ids"]) == expected_events

        events = db.query(SecurityEvent).all()
        assert len(events) == expected_events
        assert all(event.source_type == "DEMO_SCENARIO" for event in events)
        assert all(
            event.source_identifier == f"scenario:{scenario_id}"
            for event in events
        )
        assert all(event.processing_status == "PENDING" for event in events)
        assert all(event.timestamp.tzinfo == timezone.utc for event in events)
        assert all(event.ingested_at.tzinfo == timezone.utc for event in events)
        assert all(event.created_at.tzinfo == timezone.utc for event in events)
        assert all(event.timestamp <= event.ingested_at for event in events)
        assert all(event.processed_at is None for event in events)

    assert set(queued_ids) == set(result["event_ids"])


def test_stream_rejects_unknown_scenario_and_invalid_rate():
    collector = stream_module.LiveDemoStreamCollector()
    collector.is_running = True

    async def verify_invalid_inputs():
        with pytest.raises(ValueError, match="Unsupported demo scenario"):
            await collector.start_stream(scenario="unknown", rate=1.0)
        with pytest.raises(ValueError, match="between 0.5 and 4.0"):
            await collector.start_stream(scenario="scenario_1", rate=5.0)

    asyncio.run(verify_invalid_inputs())


def test_websocket_broadcasts_from_synchronous_worker_threads():
    broadcaster = BroadcasterService()

    class CapturingWebSocket:
        def __init__(self):
            self.received = asyncio.Event()
            self.payloads = []

        async def accept(self):
            pass

        async def send_json(self, payload):
            self.payloads.append(payload)
            if payload["type"] == "EVENT_PROCESSED":
                self.received.set()

    async def verify_thread_broadcast():
        websocket = CapturingWebSocket()
        await broadcaster.connect(websocket)
        websocket.payloads.clear()

        await asyncio.to_thread(
            broadcaster.publish_sync,
            "EVENT_PROCESSED",
            {"event_id": "EVT-THREAD-001"},
        )
        await asyncio.wait_for(websocket.received.wait(), timeout=1)

        assert websocket.payloads[-1]["data"]["event_id"] == "EVT-THREAD-001"
        await broadcaster.disconnect(websocket)

    asyncio.run(verify_thread_broadcast())


def test_stream_control_endpoint_lifecycle(stream_db, monkeypatch):
    collector = stream_module.LiveDemoStreamCollector()
    collector.is_running = True
    monkeypatch.setattr(collector_manager_module.collector_manager, "demo_collector", collector)

    async def exercise_endpoint():
        started = await control_demo_stream({
            "action": "start",
            "scenario": "scenario_3",
            "rate": 4.0,
        })
        assert started["collector_status"]["stream_state"] == "STARTING"

        with pytest.raises(HTTPException) as duplicate:
            await control_demo_stream({
                "action": "start",
                "scenario": "scenario_1",
                "rate": 1.0,
            })
        assert duplicate.value.status_code == 409

        paused = await control_demo_stream({"action": "pause"})
        assert paused["collector_status"]["stream_state"] == "PAUSED"
        resumed = await control_demo_stream({"action": "resume"})
        assert resumed["collector_status"]["stream_state"] == "STREAMING"
        stopped = await control_demo_stream({"action": "stop"})
        assert stopped["collector_status"]["stream_state"] == "STOPPED"

        with pytest.raises(HTTPException) as invalid_scenario:
            await control_demo_stream({
                "action": "start",
                "scenario": "unknown",
                "rate": 1.0,
            })
        assert invalid_scenario.value.status_code == 400

        with pytest.raises(HTTPException) as invalid_rate:
            await control_demo_stream({
                "action": "start",
                "scenario": "scenario_1",
                "rate": 10.0,
            })
        assert invalid_rate.value.status_code == 400

    asyncio.run(exercise_endpoint())
