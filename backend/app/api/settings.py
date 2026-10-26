from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.database import get_db
from app.models.audit import AuditLog
from app.config import settings

router = APIRouter(prefix="/settings", tags=["Settings & Policies"])

# In-memory policy config state that can be adjusted dynamically
runtime_policies = {
    "auto_containment_threshold": 85,
    "require_human_approval": True,
    "dry_run_default": True,
    "max_event_retention_days": 90,
    "llm_provider": settings.LLM_PROVIDER,
    "anomaly_contamination_rate": 0.03
}

@router.get("/policies")
def get_policies():
    return runtime_policies

@router.put("/policies")
def update_policies(new_policies: Dict[str, Any] = Body(...)):
    runtime_policies.update(new_policies)
    return runtime_policies

@router.get("/audit-logs")
def get_audit_logs(limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "actor": l.actor,
            "action": l.action,
            "target_type": l.target_type,
            "target_id": l.target_id,
            "details": l.details,
            "ip_address": l.ip_address,
            "status": l.status,
            "timestamp": l.timestamp.isoformat()
        } for l in logs
    ]
