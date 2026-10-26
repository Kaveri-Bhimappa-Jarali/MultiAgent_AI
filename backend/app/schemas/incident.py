from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.event import SecurityEventResponse

class IncidentBase(BaseModel):
    title: str
    description: Optional[str] = None
    severity: str
    risk_score: int
    confidence: float
    status: str
    assigned_analyst: str = "Unassigned"
    investigation_status: str = "PENDING"
    response_status: str = "NONE"

class IncidentResponse(IncidentBase):
    id: int
    incident_id: str
    first_seen: datetime
    last_seen: datetime
    affected_users: List[str]
    affected_hosts: List[str]
    affected_ips: List[str]
    event_count: int
    ai_summary: Optional[Dict[str, Any]] = None
    attack_path_json: Optional[Dict[str, Any]] = None
    is_simulated: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class IncidentNoteCreate(BaseModel):
    note: str

class IncidentNoteResponse(BaseModel):
    id: int
    incident_id: str
    author: str
    note: str
    created_at: datetime

    class Config:
        from_attributes = True

class IncidentStatusUpdate(BaseModel):
    status: Optional[str] = None
    assigned_analyst: Optional[str] = None
    note: Optional[str] = None

class IncidentDetailResponse(IncidentResponse):
    events: List[SecurityEventResponse] = []
    notes: List[IncidentNoteResponse] = []
    risk_assessment: Optional[Dict[str, Any]] = None
    response_actions: List[Dict[str, Any]] = []
    verification_results: List[Dict[str, Any]] = []
    audits: List[Dict[str, Any]] = []
    agent_findings: List[Dict[str, Any]] = []
