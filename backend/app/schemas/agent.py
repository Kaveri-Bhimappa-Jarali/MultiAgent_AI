from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class AgentFindingResponse(BaseModel):
    id: int
    finding_id: str
    run_id: str
    agent_name: str
    title: str
    severity: str
    confidence: float
    description: str
    evidence: Dict[str, Any]
    recommendations: List[str]
    created_at: datetime

    class Config:
        from_attributes = True

class AgentExecutionResponse(BaseModel):
    id: int
    run_id: str
    agent_name: str
    status: str
    start_time: datetime
    end_time: Optional[datetime]
    duration_ms: int
    input_summary: Optional[str]
    findings_count: int
    execution_log: List[Any]
    error_message: Optional[str]

    class Config:
        from_attributes = True

class AgentStatusItem(BaseModel):
    name: str
    role_description: str
    status: str  # IDLE, RUNNING, COMPLETED, FAILED
    last_run_time: Optional[datetime] = None
    total_findings: int = 0
    health: str = "HEALTHY"

class AgentRunRequest(BaseModel):
    agent_name: Optional[str] = None  # None means run all 10 agents
    incident_id: Optional[str] = None
    time_window_minutes: int = 60
