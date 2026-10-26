from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, ForeignKey
from datetime import datetime, timezone
from app.database import Base

class ResponseAction(Base):
    __tablename__ = "response_actions"

    id = Column(Integer, primary_key=True, index=True)
    action_id = Column(String(64), unique=True, index=True, nullable=False)
    incident_id = Column(String(64), ForeignKey("incidents.incident_id", ondelete="CASCADE"), index=True, nullable=False)
    action_type = Column(String(50), nullable=False)  # BLOCK_IP, DISABLE_USER, ISOLATE_ENDPOINT, NOTIFY_ANALYST, RESET_CREDENTIALS
    target_type = Column(String(30), nullable=False)  # IP, USER, ENDPOINT, ANALYST_CHANNEL
    target_value = Column(String(100), nullable=False)
    reason = Column(Text, nullable=False)
    expected_effect = Column(Text, nullable=False)
    
    status = Column(String(30), default="RECOMMENDED", index=True, nullable=False)  # RECOMMENDED, PENDING_APPROVAL, APPROVED, EXECUTED, REJECTED, FAILED
    is_dry_run = Column(Boolean, default=True, nullable=False)
    requires_approval = Column(Boolean, default=True, nullable=False)
    
    approved_by = Column(String(100), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    execution_result = Column(JSON, nullable=True)
    executed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

class VerificationResult(Base):
    __tablename__ = "verification_results"

    id = Column(Integer, primary_key=True, index=True)
    verification_id = Column(String(64), unique=True, index=True, nullable=False)
    action_id = Column(String(64), ForeignKey("response_actions.action_id", ondelete="CASCADE"), index=True, nullable=False)
    incident_id = Column(String(64), ForeignKey("incidents.incident_id", ondelete="CASCADE"), index=True, nullable=False)
    verification_status = Column(String(40), default="PENDING_VERIFICATION", index=True, nullable=False)  # PENDING_VERIFICATION, VERIFICATION_IN_PROGRESS, VERIFIED_CONTAINED, VERIFICATION_FAILED, INCONCLUSIVE
    checks_performed = Column(JSON, default=list, nullable=False)
    observed_events_count = Column(Integer, default=0, nullable=False)
    evidence_summary = Column(Text, nullable=False)
    verified_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
