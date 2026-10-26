from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON
from datetime import datetime, timezone
from app.database import Base

class CollectorConfig(Base):
    __tablename__ = "collector_configs"

    id = Column(Integer, primary_key=True, index=True)
    collector_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    collector_type = Column(String(50), nullable=False)  # API, FILE_WATCHER, SYSLOG, NETWORK_SENSOR, DEMO_STREAM
    enabled = Column(Boolean, default=True, nullable=False)
    status = Column(String(30), default="CONFIGURED", nullable=False)  # CONFIGURED, CONNECTED, RECEIVING, PROCESSING, STALE, ERROR
    config_data = Column(JSON, default=dict, nullable=False)
    
    last_event_at = Column(DateTime, nullable=True)
    total_events_received = Column(Integer, default=0, nullable=False)
    total_events_processed = Column(Integer, default=0, nullable=False)
    error_count = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
