from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, JSON
from datetime import datetime, timezone
from app.database import Base

class DetectionRule(Base):
    __tablename__ = "detection_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)  # Authentication, Network, Endpoint, Privilege, Exfiltration
    severity = Column(String(20), default="MEDIUM", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    conditions = Column(JSON, nullable=False)  # Rule condition criteria
    threshold = Column(Integer, default=1, nullable=False)
    time_window_seconds = Column(Integer, default=300, nullable=False)
    mitre_technique = Column(String(50), nullable=True)  # e.g., T1110 (Brute Force)
    enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

class DetectionFinding(Base):
    __tablename__ = "detection_findings"

    id = Column(Integer, primary_key=True, index=True)
    finding_id = Column(String(64), unique=True, index=True, nullable=False)
    rule_id = Column(String(50), index=True, nullable=True)
    rule_name = Column(String(150), nullable=False)
    detection_method = Column(String(50), default="RULE_BASED", nullable=False)  # RULE_BASED, ANOMALY_DETECTION, AGENT_ANALYSIS, HYBRID
    severity = Column(String(20), default="MEDIUM", nullable=False)
    confidence = Column(Float, default=0.85, nullable=False)
    explanation = Column(Text, nullable=False)
    evidence = Column(JSON, nullable=False)  # list of event_ids and extracted evidence facts
    next_step = Column(String(255), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True, nullable=False)
