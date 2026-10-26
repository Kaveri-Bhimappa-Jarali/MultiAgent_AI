from sqlalchemy import Column, Integer, String, DateTime, Text, JSON
from datetime import datetime, timezone
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor = Column(String(100), index=True, nullable=False)
    action = Column(String(100), index=True, nullable=False)  # USER_LOGIN, INGEST_EVENTS, APPROVE_RESPONSE, EXECUTE_RESPONSE, RUN_AGENT, UPDATE_RULE
    target_type = Column(String(50), nullable=True)  # INCIDENT, RESPONSE_ACTION, EVENT, RULE, AGENT
    target_id = Column(String(100), nullable=True)
    details = Column(JSON, default=dict, nullable=False)
    ip_address = Column(String(45), nullable=True)
    status = Column(String(30), default="SUCCESS", nullable=False)  # SUCCESS, FAILED, UNAUTHORIZED
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True, nullable=False)
