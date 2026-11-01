import json
import asyncio
from datetime import datetime, timezone
from typing import Set, Dict, Any, List, Optional
from fastapi import WebSocket

class BroadcasterService:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.recent_events_buffer: List[Dict[str, Any]] = []
        self.max_buffer_size = 50
        self.total_broadcasts = 0
        self._lock = asyncio.Lock()
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    async def connect(self, websocket: WebSocket):
        self._loop = asyncio.get_running_loop()
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        # Send recent events catchup buffer
        try:
            await websocket.send_json({
                "type": "INITIAL_SYNC",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": {
                    "recent_events": self.recent_events_buffer[-15:],
                    "connected_clients": len(self.active_connections)
                }
            })
        except Exception:
            pass

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.discard(websocket)

    async def broadcast(self, event_type: str, data: Any):
        """
        Broadcasts a message to all active WebSocket clients.
        """
        payload = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        # Store in circular catchup buffer
        async with self._lock:
            self.recent_events_buffer.append(payload)
            if len(self.recent_events_buffer) > self.max_buffer_size:
                self.recent_events_buffer.pop(0)
            self.total_broadcasts += 1
            connections = list(self.active_connections)

        # Broadcast concurrently
        disconnected = []
        for ws in connections:
            try:
                await ws.send_json(payload)
            except Exception:
                disconnected.append(ws)

        if disconnected:
            async with self._lock:
                for ws in disconnected:
                    self.active_connections.discard(ws)

    def publish_sync(self, event_type: str, data: Any):
        """
        Helper for synchronous call sites to dispatch an async broadcast on the running loop.
        """
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            current_loop = None

        loop = self._loop or current_loop
        if loop is None or loop.is_closed() or not loop.is_running():
            return
        if current_loop is loop:
            asyncio.create_task(self.broadcast(event_type, data))
        else:
            loop.call_soon_threadsafe(
                asyncio.create_task,
                self.broadcast(event_type, data)
            )

broadcaster = BroadcasterService()
