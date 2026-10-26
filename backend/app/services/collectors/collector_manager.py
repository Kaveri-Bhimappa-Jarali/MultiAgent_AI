import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

from app.services.collectors.file_watcher_collector import FileWatcherCollector
from app.services.collectors.syslog_collector import SyslogCollector
from app.services.collectors.live_demo_stream_collector import demo_stream_collector, LiveDemoStreamCollector
from app.services.broadcaster import broadcaster

class CollectorManager:
    def __init__(self):
        self.file_watcher = FileWatcherCollector()
        self.syslog_collector = SyslogCollector()
        self.demo_collector = demo_stream_collector
        
        self.collectors = {
            "collector-api": {
                "collector_id": "collector-api",
                "name": "FastAPI REST Event Ingestion Gateway",
                "collector_type": "API",
                "is_running": True,
                "status": "RECEIVING"
            },
            self.file_watcher.collector_id: self.file_watcher,
            self.syslog_collector.collector_id: self.syslog_collector,
            self.demo_collector.collector_id: self.demo_collector
        }

    async def start_all(self):
        print("[CollectorManager] Starting active security telemetry collectors...")
        await self.file_watcher.start()
        await self.syslog_collector.start()
        await self.demo_collector.start()
        broadcaster.publish_sync("COLLECTOR_STATUS_CHANGED", self.get_all_statuses())

    async def stop_all(self):
        print("[CollectorManager] Stopping collectors...")
        await self.file_watcher.stop()
        await self.syslog_collector.stop()
        await self.demo_collector.stop()

    def get_collector(self, collector_id: str):
        return self.collectors.get(collector_id)

    def get_all_statuses(self) -> List[Dict[str, Any]]:
        statuses = []
        for cid, col in self.collectors.items():
            if hasattr(col, "get_status"):
                statuses.append(col.get_status())
            else:
                # Built-in API adapter
                statuses.append({
                    "collector_id": "collector-api",
                    "name": "FastAPI REST Event Ingestion Gateway",
                    "collector_type": "API",
                    "is_running": True,
                    "status": "RECEIVING",
                    "last_event_at": datetime.now(timezone.utc).isoformat(),
                    "total_received": 0,
                    "total_processed": 0,
                    "error_count": 0,
                    "error_message": None
                })
        return statuses

    def get_freshness_warnings(self, threshold_minutes: int = 5) -> List[Dict[str, Any]]:
        """
        Differentiates between 'no suspicious activity' and 'no telemetry received'.
        Raises operational alerts if active collectors have gone silent.
        """
        now = datetime.now(timezone.utc)
        warnings = []
        for cid, col in self.collectors.items():
            if hasattr(col, "is_running") and col.is_running:
                if col.last_event_at:
                    diff = (now - col.last_event_at).total_seconds() / 60.0
                    if diff > threshold_minutes and col.collector_type != "DEMO_STREAM":
                        warnings.append({
                            "collector_id": cid,
                            "name": col.name,
                            "warning": f"No telemetry received in the past {int(diff)} minutes. Collector may be disconnected.",
                            "severity": "WARNING",
                            "last_event_at": col.last_event_at.isoformat()
                        })
        return warnings

collector_manager = CollectorManager()
