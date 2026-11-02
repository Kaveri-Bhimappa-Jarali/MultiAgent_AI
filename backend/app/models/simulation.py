from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
from datetime import datetime, timezone
from app.database import Base

class AttackSimulationExecution(Base):
    __tablename__ = "attack_simulations"

    id = Column(Integer, primary_key=True, index=True)
    execution_id = Column(String(64), unique=True, index=True, nullable=False)
    
    scenario_category = Column(String(50), index=True, nullable=False)
    scenario_id = Column(String(50), index=True, nullable=False)
    scenario_name = Column(String(100), nullable=False)
    
    attacker_ip = Column(String(45), nullable=False)
    target_ip = Column(String(45), index=True, nullable=False)
    target_port = Column(Integer, nullable=True)
    parameters = Column(JSON, default=dict, nullable=False)
    
    # Separate pipeline tracking states as required
    status = Column(String(30), default="PENDING", index=True, nullable=False) # PENDING, RUNNING, COMPLETED, STOPPED, FAILED
    traffic_status = Column(String(30), default="NOT_STARTED", nullable=False) # NOT_STARTED, GENERATING, GENERATED, TERMINATED
    flow_status = Column(String(30), default="PENDING", nullable=False)        # PENDING, CAPTURING, CAPTURED
    ml_status = Column(String(30), default="PENDING", nullable=False)          # PENDING, INFERRED, DETECTED
    soc_alert_status = Column(String(30), default="PENDING", nullable=False)   # PENDING, FINDINGS_RECORDED, INCIDENT_CREATED, NO_ALERT
    
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    exit_code = Column(Integer, nullable=True)
    
    summary = Column(Text, nullable=True)
    raw_logs = Column(Text, default="", nullable=False)
    metrics = Column(JSON, default=dict, nullable=False)
    
    associated_event_ids = Column(JSON, default=list, nullable=False)
    associated_finding_ids = Column(JSON, default=list, nullable=False)
    associated_incident_id = Column(String(64), nullable=True)
    
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
