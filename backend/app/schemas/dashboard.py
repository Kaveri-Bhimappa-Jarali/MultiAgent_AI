from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class MetricSummary(BaseModel):
    total_events: int
    events_in_timerange: int
    open_incidents: int
    critical_high_incidents: int
    active_agents: int
    idle_agents: int
    error_agents: int
    incidents_awaiting_investigation: int
    actions_pending_approval: int
    contained_threats: int
    verification_failures: int

class TrendPoint(BaseModel):
    timestamp: str
    events_count: int
    alerts_count: int

class SeverityCount(BaseModel):
    severity: str
    count: int

class CategoryCount(BaseModel):
    category: str
    count: int

class AgentHealthCard(BaseModel):
    name: str
    status: str
    health: str
    last_run: Optional[str] = None
    findings_count: int = 0

class DashboardSummaryResponse(BaseModel):
    metrics: MetricSummary
    event_trends: List[TrendPoint]
    severity_distribution: List[SeverityCount]
    category_distribution: List[CategoryCount]
    agent_health: List[AgentHealthCard]
    recent_critical_incidents: List[Dict[str, Any]]
    recent_events: List[Dict[str, Any]]
    system_status: Dict[str, Any]
