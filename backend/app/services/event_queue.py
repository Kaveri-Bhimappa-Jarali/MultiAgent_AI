import asyncio
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.event import SecurityEvent
from app.services.detection_service import evaluate_event_with_rolling_window
from app.agents.orchestrator import MultiAgentSOCEngine
from app.services.broadcaster import broadcaster

class RealtimeEventQueue:
    def __init__(self):
        self.queue: asyncio.Queue[str] = asyncio.Queue()
        self.worker_task: Optional[asyncio.Task] = None
        self.is_running: bool = False
        
        # Telemetry & Performance Metrics
        self.total_enqueued: int = 0
        self.total_processed: int = 0
        self.total_failed: int = 0
        
        self.detection_latencies_ms: List[float] = []
        self.incident_latencies_ms: List[float] = []
        
        self.received_timestamps: List[datetime] = []
        self.processed_timestamps: List[datetime] = []
        
        self.last_processed_at: Optional[datetime] = None

    def start_worker(self):
        if not self.is_running:
            self.is_running = True
            self.worker_task = asyncio.create_task(self._worker_loop())
            print("[EventQueue] Real-time detection & agent worker loop started.")

    async def stop_worker(self):
        self.is_running = False
        if self.worker_task:
            self.worker_task.cancel()
            try:
                await self.worker_task
            except asyncio.CancelledError:
                pass
            print("[EventQueue] Worker loop gracefully stopped.")

    def enqueue_event(self, event_id: str):
        self.queue.put_nowait(event_id)
        self.total_enqueued += 1
        now = datetime.now(timezone.utc)
        self.received_timestamps.append(now)
        # Keep recent 200 timestamps for rate calculation
        if len(self.received_timestamps) > 200:
            self.received_timestamps = self.received_timestamps[-200:]

    def enqueue_events(self, event_ids: List[str]):
        for eid in event_ids:
            self.enqueue_event(eid)

    def recover_pending_events(self, db: Session):
        """
        Guarantees zero data loss on server restart: Re-enqueues unanalyzed events.
        """
        pending = db.query(SecurityEvent).filter(
            SecurityEvent.processing_status.in_(["PENDING", "PROCESSING"])
        ).order_by(SecurityEvent.timestamp.asc()).all()

        if pending:
            print(f"[EventQueue] Recovering {len(pending)} unanalyzed pending events from database...")
            for e in pending:
                e.processing_status = "PENDING"
                self.enqueue_event(e.event_id)
            db.commit()

    async def _worker_loop(self):
        """
        Continuous non-blocking event processor:
        Ingest -> Queue -> Rolling Detection -> Event-Driven Agents -> Correlation -> Risk -> UI Broadcast
        """
        while self.is_running:
            try:
                event_id = await self.queue.get()
                await self._process_single_event(event_id)
                self.queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[EventQueue] Error in worker loop: {e}")
                await asyncio.sleep(0.1)

    async def _process_single_event(self, event_id: str):
        # Run blocking SQLAlchemy operations in threadpool so async loop is never blocked
        await asyncio.to_thread(self._process_single_event_sync, event_id)

    def _process_single_event_sync(self, event_id: str):
        db = SessionLocal()
        start_time = time.perf_counter()
        now = datetime.now(timezone.utc)

        try:
            event = db.query(SecurityEvent).filter(SecurityEvent.event_id == event_id).first()
            if not event:
                return

            event.processing_status = "PROCESSING"
            db.commit()

            # 1. Automatic Rolling-Window Threat Detection & ML Anomaly Scoring
            t0 = time.perf_counter()
            findings = evaluate_event_with_rolling_window(db, event)
            det_latency = (time.perf_counter() - t0) * 1000
            self.detection_latencies_ms.append(det_latency)
            if len(self.detection_latencies_ms) > 100:
                self.detection_latencies_ms.pop(0)

            # Broadcast any findings immediately
            for f in findings:
                broadcaster.publish_sync("DETECTION_TRIGGERED", {
                    "finding_id": f.finding_id,
                    "rule_id": f.rule_id,
                    "rule_name": f.rule_name,
                    "severity": f.severity,
                    "confidence": f.confidence,
                    "explanation": f.explanation,
                    "timestamp": f.timestamp.isoformat()
                })

            # 2. Event-Driven Agent Orchestration & Automatic Correlation
            engine = MultiAgentSOCEngine(db)
            t_inc = time.perf_counter()
            dispatch_res = engine.dispatch_event_driven_pipeline(event, findings)
            inc_latency = (time.perf_counter() - t_inc) * 1000
            self.incident_latencies_ms.append(inc_latency)
            if len(self.incident_latencies_ms) > 100:
                self.incident_latencies_ms.pop(0)

            # 3. Finalize Event Status
            event.processing_status = "PROCESSED"
            event.detection_status = "ANALYZED"
            event.processing_error = None
            db.commit()

            self.total_processed += 1
            self.last_processed_at = now
            self.processed_timestamps.append(now)
            if len(self.processed_timestamps) > 200:
                self.processed_timestamps = self.processed_timestamps[-200:]

            # 4. Broadcast Event Processed to Frontend
            broadcaster.publish_sync("EVENT_PROCESSED", {
                "event_id": event.event_id,
                "event_type": event.event_type,
                "severity": event.severity,
                "processing_status": "PROCESSED",
                "detection_findings_count": len(findings),
                "agents_executed": dispatch_res.get("agents_executed", 0),
                "detection_latency_ms": round(det_latency, 2),
                "total_processing_ms": round((time.perf_counter() - start_time) * 1000, 2),
                "timestamp": event.timestamp.isoformat()
            })

        except Exception as e:
            self.total_failed += 1
            print(f"[EventQueue] Failed processing event {event_id}: {e}")
            try:
                evt = db.query(SecurityEvent).filter(SecurityEvent.event_id == event_id).first()
                if evt:
                    evt.processing_status = "FAILED"
                    evt.processing_error = str(e)
                    db.commit()
            except Exception:
                pass
        finally:
            db.close()

    def get_metrics(self) -> Dict[str, Any]:
        """
        Returns live queue performance and latency telemetry.
        """
        now = datetime.now(timezone.utc)
        one_min_ago = now - timedelta(minutes=1)

        recv_per_min = sum(1 for t in self.received_timestamps if t >= one_min_ago)
        proc_per_min = sum(1 for t in self.processed_timestamps if t >= one_min_ago)

        avg_det_lat = (
            sum(self.detection_latencies_ms) / len(self.detection_latencies_ms)
            if self.detection_latencies_ms else 0.0
        )
        avg_inc_lat = (
            sum(self.incident_latencies_ms) / len(self.incident_latencies_ms)
            if self.incident_latencies_ms else 0.0
        )

        return {
            "queue_depth": self.queue.qsize(),
            "is_running": self.is_running,
            "total_enqueued": self.total_enqueued,
            "total_processed": self.total_processed,
            "total_failed": self.total_failed,
            "events_received_per_minute": recv_per_min,
            "events_processed_per_minute": proc_per_min,
            "avg_detection_latency_ms": round(avg_det_lat, 2),
            "avg_incident_latency_ms": round(avg_inc_lat, 2),
            "last_processed_at": self.last_processed_at.isoformat() if self.last_processed_at else None
        }

event_queue = RealtimeEventQueue()
