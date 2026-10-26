from sqlalchemy import Column, Integer, String, DateTime, Text, Float, JSON
from datetime import datetime, timezone
from app.database import Base

class AgentExecution(Base):
    __tablename__ = "agent_executions"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String(64), index=True, nullable=False)
    agent_name = Column(String(100), index=True, nullable=False)
    status = Column(String(30), default="IDLE", index=True, nullable=False)  # IDLE, RUNNING, COMPLETED, FAILED
    start_time = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    end_time = Column(DateTime, nullable=True)
    duration_ms = Column(Integer, default=0, nullable=False)
    input_summary = Column(Text, nullable=True)
    findings_count = Column(Integer, default=0, nullable=False)
    execution_log = Column(JSON, default=list, nullable=False)  # list of log message entries with timestamps
    error_message = Column(Text, nullable=True)

class AgentFinding(Base):
    __tablename__ = "agent_findings"

    id = Column(Integer, primary_key=True, index=True)
    finding_id = Column(String(64), unique=True, index=True, nullable=False)
    run_id = Column(String(64), index=True, nullable=False)
    agent_name = Column(String(100), index=True, nullable=False)
    title = Column(String(200), nullable=False)
    severity = Column(String(20), default="MEDIUM", nullable=False)
    confidence = Column(Float, default=0.85, nullable=False)
    description = Column(Text, nullable=False)
    evidence = Column(JSON, default=dict, nullable=False)
    recommendations = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
