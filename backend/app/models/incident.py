from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, JSON, ForeignKey, Index
from datetime import datetime, timezone
from app.database import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(64), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), default="MEDIUM", index=True, nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    risk_score = Column(Integer, default=50, index=True, nullable=False)  # 0 to 100
    confidence = Column(Float, default=0.85, nullable=False)
    status = Column(String(30), default="NEW", index=True, nullable=False)  # NEW, INVESTIGATING, CONTAINED, RESOLVED, FALSE_POSITIVE
    
    first_seen = Column(DateTime, nullable=False)
    last_seen = Column(DateTime, nullable=False)
    
    affected_users = Column(JSON, default=list, nullable=False)
    affected_hosts = Column(JSON, default=list, nullable=False)
    affected_ips = Column(JSON, default=list, nullable=False)
    event_count = Column(Integer, default=1, nullable=False)
    
    assigned_analyst = Column(String(100), default="Unassigned", nullable=False)
    investigation_status = Column(String(30), default="PENDING", nullable=False)  # PENDING, IN_PROGRESS, COMPLETED
    response_status = Column(String(30), default="NONE", nullable=False)  # NONE, RECOMMENDED, PENDING_APPROVAL, EXECUTED, VERIFIED
    
    ai_summary = Column(JSON, nullable=True)  # Structured 8-question answers
    attack_path_json = Column(JSON, nullable=True)  # Directed graph nodes & edges
    is_simulated = Column(Boolean, default=False, index=True, nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

class IncidentEvent(Base):
    __tablename__ = "incident_events"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(64), ForeignKey("incidents.incident_id", ondelete="CASCADE"), index=True, nullable=False)
    event_id = Column(String(64), ForeignKey("security_events.event_id", ondelete="CASCADE"), index=True, nullable=False)
    sequence_order = Column(Integer, default=0, nullable=False)
    added_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("idx_incident_event_seq", "incident_id", "sequence_order"),
    )

class IncidentNote(Base):
    __tablename__ = "incident_notes"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(64), ForeignKey("incidents.incident_id", ondelete="CASCADE"), index=True, nullable=False)
    author = Column(String(100), nullable=False)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

class IncidentAudit(Base):
    __tablename__ = "incident_audits"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(64), ForeignKey("incidents.incident_id", ondelete="CASCADE"), index=True, nullable=False)
    actor = Column(String(100), nullable=False)
    action = Column(String(100), nullable=False)  # STATUS_CHANGE, SEVERITY_CHANGE, ASSIGNMENT, NOTE_ADDED, RESPONSE_INITIATED
    previous_state = Column(String(100), nullable=True)
    new_state = Column(String(100), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
