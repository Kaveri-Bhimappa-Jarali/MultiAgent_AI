from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class ResponseActionCreate(BaseModel):
    incident_id: str
    action_type: str  # BLOCK_IP, DISABLE_USER, ISOLATE_ENDPOINT, NOTIFY_ANALYST, RESET_CREDENTIALS
    target_type: str
    target_value: str
    reason: str
    expected_effect: str
    is_dry_run: bool = True
    requires_approval: bool = True

class ResponseActionResponse(BaseModel):
    id: int
    action_id: str
    incident_id: str
    action_type: str
    target_type: str
    target_value: str
    reason: str
    expected_effect: str
    status: str
    is_dry_run: bool
    requires_approval: bool
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    execution_result: Optional[Dict[str, Any]]
    executed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class VerificationResultResponse(BaseModel):
    id: int
    verification_id: str
    action_id: str
    incident_id: str
    verification_status: str
    checks_performed: List[Dict[str, Any]]
    observed_events_count: int
    evidence_summary: str
    verified_at: datetime

    class Config:
        from_attributes = True
