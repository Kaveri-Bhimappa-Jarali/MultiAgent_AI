from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.services.auth_service import seed_default_users
from app.services.detection_service import seed_detection_rules
from app.services.threat_intel_service import seed_threat_intelligence
from app.services.event_queue import event_queue
from app.services.collectors.collector_manager import collector_manager
from app.services.broadcaster import broadcaster

# Import all API routers
from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.events import router as events_router
from app.api.detections import router as detections_router
from app.api.agents import router as agents_router
from app.api.incidents import router as incidents_router
from app.api.responses import router as responses_router
from app.api.intelligence import router as intelligence_router
from app.api.evaluation import router as evaluation_router
from app.api.reports import router as reports_router
from app.api.demo import router as demo_router
from app.api.settings import router as settings_router
from app.api.health_monitor import router as health_monitor_router
from app.api.virtual_lab import router as vm_router
from app.services.vm_service import seed_default_vm_nodes

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Startup: Initialize tables and seed initial operational datasets
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_default_users(db)
        seed_detection_rules(db)
        seed_threat_intelligence(db)
        seed_default_vm_nodes(db)
        
        # 2. Recover unanalyzed pending events from database on restart
        event_queue.recover_pending_events(db)
    finally:
        db.close()

    # 3. Start real-time background detection & agent worker loop
    event_queue.start_worker()

    # 4. Start active security telemetry collectors
    await collector_manager.start_all()

    yield

    # Shutdown: Graceful stop
    await collector_manager.stop_all()
    await event_queue.stop_worker()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise Multi-Agent AI Security Operations Center (SOC) for Real-Time Threat Detection",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(events_router, prefix=settings.API_V1_STR)
app.include_router(detections_router, prefix=settings.API_V1_STR)
app.include_router(agents_router, prefix=settings.API_V1_STR)
app.include_router(incidents_router, prefix=settings.API_V1_STR)
app.include_router(responses_router, prefix=settings.API_V1_STR)
app.include_router(intelligence_router, prefix=settings.API_V1_STR)
app.include_router(evaluation_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(demo_router, prefix=settings.API_V1_STR)
app.include_router(settings_router, prefix=settings.API_V1_STR)
app.include_router(health_monitor_router, prefix=settings.API_V1_STR)
app.include_router(vm_router, prefix=settings.API_V1_STR)

# Global WebSocket endpoint at both /api/ws and /ws
@app.websocket("/api/ws")
@app.websocket("/ws")
async def global_websocket_endpoint(websocket: WebSocket):
    await broadcaster.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await broadcaster.disconnect(websocket)
    except Exception:
        await broadcaster.disconnect(websocket)

@app.get("/")
def root():
    return {
        "status": "ONLINE",
        "service": settings.PROJECT_NAME,
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR,
        "websocket_url": "/api/ws",
        "realtime_detection": "ACTIVE"
    }

@app.get("/health")
def healthcheck():
    q_metrics = event_queue.get_metrics()
    return {
        "status": "HEALTHY",
        "engine": "Multi-Agent AI SOC",
        "agents": 10,
        "queue_depth": q_metrics["queue_depth"],
        "total_processed": q_metrics["total_processed"],
        "collectors_active": len([c for c in collector_manager.get_all_statuses() if c.get("is_running")]),
        "version": "1.0.0"
    }
