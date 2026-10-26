from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any
from datetime import datetime

class SecurityEventBase(BaseModel):
    event_type: str = Field(..., description="Type of event: authentication, network_connection, process_execution, file_access, privilege_escalation")
    severity: str = Field("INFO", description="INFO, LOW, MEDIUM, HIGH, CRITICAL")
    timestamp: Optional[datetime] = None
    
    # Source metadata
    source_type: Optional[str] = Field("API", description="API, LOG_FILE_WATCHER, SYSLOG, NETWORK_COLLECTOR, WINDOWS_COLLECTOR, LINUX_AUTH, DEMO_STREAM")
    source_identifier: Optional[str] = None
    
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    source_port: Optional[int] = None
    destination_port: Optional[int] = None
    protocol: Optional[str] = None
    username: Optional[str] = None
    host: Optional[str] = None
    process_name: Optional[str] = None
    process_path: Optional[str] = None
    command_line: Optional[str] = None
    file_path: Optional[str] = None
    file_action: Optional[str] = None
    correlation_id: Optional[str] = None
    is_simulated: bool = False
    raw_payload: Optional[str] = None

class SecurityEventCreate(SecurityEventBase):
    event_id: Optional[str] = None

class SecurityEventResponse(SecurityEventBase):
    id: int
    event_id: str
    timestamp: datetime
    ingested_at: Optional[datetime] = None
    detection_status: str
    processing_status: str = "PROCESSED"
    processing_error: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class EventBatchIngest(BaseModel):
    events: List[SecurityEventCreate]

class IngestionResult(BaseModel):
    total_received: int
    accepted: int
    duplicates_skipped: int
    errors: int
    queued_for_processing: int = 0
    detections_triggered: int = 0
    incidents_updated: int = 0
