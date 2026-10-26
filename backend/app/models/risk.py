from sqlalchemy import Column, Integer, String, DateTime, Text, Float, JSON, ForeignKey
from datetime import datetime, timezone
from app.database import Base

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(64), ForeignKey("incidents.incident_id", ondelete="CASCADE"), index=True, nullable=False)
    overall_score = Column(Integer, nullable=False)  # 0 to 100
    severity_band = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    progression_stage = Column(String(50), nullable=False)  # Reconnaissance, Initial Access, Privilege Escalation, Lateral Movement, Data Access, Exfiltration
    criticality_multiplier = Column(Float, default=1.0, nullable=False)
    factors = Column(JSON, nullable=False)  # Detailed dictionary with factor weights and scores
    explanation = Column(Text, nullable=False)
    assessed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
