from sqlalchemy import Column, Integer, String, DateTime, Text, Float, JSON
from datetime import datetime, timezone
from app.database import Base

class ThreatIndicator(Base):
    __tablename__ = "threat_indicators"

    id = Column(Integer, primary_key=True, index=True)
    indicator_type = Column(String(30), index=True, nullable=False)  # IP, DOMAIN, MD5, SHA256, URL
    indicator_value = Column(String(255), unique=True, index=True, nullable=False)
    threat_name = Column(String(100), nullable=False)
    threat_actor = Column(String(100), default="Unknown", nullable=False)
    confidence = Column(Float, default=0.9, nullable=False)
    severity = Column(String(20), default="HIGH", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    tags = Column(JSON, default=list, nullable=False)  # e.g., ["C2", "Tor", "BruteForce", "Scanner"]
    description = Column(Text, nullable=True)
    first_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    last_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
