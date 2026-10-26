from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.models.audit import AuditLog
from typing import Optional, Dict, Any

def log_audit_entry(
    db: Session,
    actor: str,
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    status: str = "SUCCESS"
):
    try:
        entry = AuditLog(
            actor=actor,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id else None,
            details=details or {},
            ip_address=ip_address,
            status=status,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(entry)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error logging audit entry: {e}")
