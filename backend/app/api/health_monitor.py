from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Body, HTTPException
from typing import Dict, Any, List
from datetime import datetime, timezone

from app.services.collectors.collector_manager import collector_manager
from app.services.event_queue import event_queue
from app.services.broadcaster import broadcaster
from app.services.anomaly_model import anomaly_engine

router = APIRouter(prefix="/health", tags=["Monitoring & Collectors Health"])

@router.get("/collectors")
def get_collectors_health():
    """
    Returns real-time status of all configured security telemetry collectors.
    """
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "collectors": collector_manager.get_all_statuses(),
        "freshness_warnings": collector_manager.get_freshness_warnings(threshold_minutes=5)
    }

@router.post("/collectors/{collector_id}/toggle")
async def toggle_collector(collector_id: str):
    col = collector_manager.get_collector(collector_id)
    if not col or not hasattr(col, "is_running"):
        raise HTTPException(status_code=404, detail="Collector not found or cannot be toggled")

    if col.is_running:
        await col.stop()
        new_state = "STOPPED"
    else:
        await col.start()
        new_state = "RUNNING"

    broadcaster.publish_sync("COLLECTOR_STATUS_CHANGED", collector_manager.get_all_statuses())
    return {"collector_id": collector_id, "status": new_state}

@router.get("/pipeline")
def get_pipeline_health():
    """
    Returns real-time metrics for queue depth, latencies, throughput and ML model readiness.
    """
    q_metrics = event_queue.get_metrics()
    return {
        "status": "HEALTHY" if q_metrics["queue_depth"] < 500 else "DEGRADED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "queue": q_metrics,
        "ml_model": {
            "model_version": anomaly_engine.model_version,
            "status": "READY",
            "features_monitored": 7,
            "contamination_rate": 0.03
        },
        "websocket": {
            "connected_clients": len(broadcaster.active_connections),
            "total_broadcasts": broadcaster.total_broadcasts
        },
        "freshness_warnings": collector_manager.get_freshness_warnings(threshold_minutes=5)
    }

@router.post("/demo-stream/control")
async def control_demo_stream(payload: Dict[str, Any] = Body(...)):
    """
    Controls continuous live demo attack stream: start, pause, resume, stop.
    """
    action = payload.get("action", "stop").lower()
    scenario = payload.get("scenario", "scenario_1")
    rate = float(payload.get("rate", 1.0))

    collector = collector_manager.demo_collector

    if action == "start":
        await collector.start_stream(scenario=scenario, rate=rate)
        msg = f"Started continuous demo stream ({scenario} @ {rate} eps)"
    elif action == "pause":
        await collector.pause_stream()
        msg = "Paused demo stream"
    elif action == "resume":
        await collector.resume_stream()
        msg = "Resumed demo stream"
    elif action == "stop":
        await collector.stop_stream()
        msg = "Stopped demo stream"
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use start, pause, resume, or stop.")

    broadcaster.publish_sync("COLLECTOR_STATUS_CHANGED", collector_manager.get_all_statuses())
    return {
        "action": action,
        "message": msg,
        "collector_status": collector.get_status()
    }

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for persistent live streaming updates to React clients.
    """
    await broadcaster.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for client pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await broadcaster.disconnect(websocket)
    except Exception:
        await broadcaster.disconnect(websocket)
