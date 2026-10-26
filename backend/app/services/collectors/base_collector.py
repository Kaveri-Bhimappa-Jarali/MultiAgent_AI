import os
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional

class BaseCollector:
    def __init__(self, collector_id: str, name: str, collector_type: str):
        self.collector_id = collector_id
        self.name = name
        self.collector_type = collector_type
        self.is_running = False
        self.last_event_at: Optional[datetime] = None
        self.total_received = 0
        self.total_processed = 0
        self.error_count = 0
        self.error_message: Optional[str] = None
        
        self.checkpoint_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data", "checkpoints")
        os.makedirs(self.checkpoint_dir, exist_ok=True)
        self.checkpoint_file = os.path.join(self.checkpoint_dir, f"{self.collector_id}.json")

    def load_checkpoint(self) -> Dict[str, Any]:
        if os.path.exists(self.checkpoint_file):
            try:
                with open(self.checkpoint_file, "r") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[{self.collector_id}] Error loading checkpoint: {e}")
        return {}

    def save_checkpoint(self, data: Dict[str, Any]):
        try:
            with open(self.checkpoint_file, "w") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"[{self.collector_id}] Error saving checkpoint: {e}")

    async def start(self):
        raise NotImplementedError

    async def stop(self):
        self.is_running = False

    def get_status(self) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        
        # Calculate state
        status_state = "STOPPED"
        if self.is_running:
            if self.last_event_at:
                seconds_since_last = (now - self.last_event_at).total_seconds()
                if seconds_since_last < 30:
                    status_state = "RECEIVING"
                elif seconds_since_last < 300:
                    status_state = "CONNECTED"
                else:
                    status_state = "STALE"
            else:
                status_state = "CONNECTED"

        return {
            "collector_id": self.collector_id,
            "name": self.name,
            "collector_type": self.collector_type,
            "is_running": self.is_running,
            "status": status_state,
            "last_event_at": self.last_event_at.isoformat() if self.last_event_at else None,
            "total_received": self.total_received,
            "total_processed": self.total_processed,
            "error_count": self.error_count,
            "error_message": self.error_message
        }
