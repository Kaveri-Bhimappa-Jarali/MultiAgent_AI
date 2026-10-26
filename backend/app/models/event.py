from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Index
from datetime import datetime, timezone
from app.database import Base

class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(64), unique=True, index=True, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True, nullable=False)
    ingested_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True, nullable=False)
    
    # Source identification
    source_type = Column(String(50), default="API", index=True, nullable=False)  # API, LOG_FILE_WATCHER, SYSLOG, NETWORK_COLLECTOR, WINDOWS_COLLECTOR, LINUX_AUTH, DEMO_STREAM
    source_identifier = Column(String(150), nullable=True)  # e.g. "auth.log", "udp:514", "api-gateway"
    
    event_type = Column(String(64), index=True, nullable=False)  # authentication, network_connection, process_execution, file_access, privilege_escalation, dns_query
    severity = Column(String(20), default="INFO", index=True, nullable=False)  # INFO, LOW, MEDIUM, HIGH, CRITICAL
    
    # Network entities
    source_ip = Column(String(45), index=True, nullable=True)
    destination_ip = Column(String(45), index=True, nullable=True)
    source_port = Column(Integer, nullable=True)
    destination_port = Column(Integer, nullable=True)
    protocol = Column(String(20), nullable=True)
    
    # Endpoint & Identity entities
    username = Column(String(100), index=True, nullable=True)
    host = Column(String(100), index=True, nullable=True)
    
    # Process & File entities
    process_name = Column(String(255), nullable=True)
    process_path = Column(String(500), nullable=True)
    command_line = Column(Text, nullable=True)
    file_path = Column(String(500), nullable=True)
    file_action = Column(String(50), nullable=True)
    
    # Operational metadata & pipeline status
    detection_status = Column(String(50), default="UNPROCESSED", index=True, nullable=False)
    processing_status = Column(String(30), default="PENDING", index=True, nullable=False)  # PENDING, PROCESSING, PROCESSED, FAILED
    correlation_id = Column(String(64), nullable=True, index=True)
    processing_error = Column(Text, nullable=True)
    
    is_simulated = Column(Boolean, default=False, index=True, nullable=False)
    raw_payload = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("idx_events_type_time", "event_type", "timestamp"),
        Index("idx_events_src_ip_time", "source_ip", "timestamp"),
        Index("idx_events_host_user", "host", "username"),
        Index("idx_events_proc_status", "processing_status"),
    )
