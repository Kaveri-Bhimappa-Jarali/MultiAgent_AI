from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from app.schemas.base import UTCBaseModel

class SimulationLaunchRequest(BaseModel):
    scenario_id: str = Field(..., description="Unique scenario identifier")
    target_ip: Optional[str] = Field(None, description="Allowed private target IP; defaults to the configured victim")
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Custom parameters strictly bounded by safety limits")

class SimulationStopRequest(BaseModel):
    reason: Optional[str] = Field("User requested stop", description="Reason for stopping simulation")

class SimulationScenario(BaseModel):
    scenario_id: str
    category: str
    name: str
    description: str
    mitre_technique: str
    severity: str
    default_parameters: Dict[str, Any]
    parameter_schema: Dict[str, Any]

class SimulationExecutionResponse(UTCBaseModel):
    execution_id: str
    scenario_category: str
    scenario_id: str
    scenario_name: str
    attacker_ip: str
    target_ip: str
    target_port: Optional[int] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)
    status: str
    traffic_status: str
    flow_status: str
    ml_status: str
    soc_alert_status: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    exit_code: Optional[int] = None
    summary: Optional[str] = None
    raw_logs: Optional[str] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)
    associated_event_ids: List[str] = Field(default_factory=list)
    associated_finding_ids: List[str] = Field(default_factory=list)
    associated_incident_id: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class VMNodeStatus(BaseModel):
    name: str
    host: str
    private_ip: str
    user: str
    port: int
    is_reachable: bool
    latency_ms: Optional[float] = None
    error: Optional[str] = None

class SimulationConnectivityStatus(BaseModel):
    attacker_vm: VMNodeStatus
    victim_vm: VMNodeStatus
    private_network_reachability: bool
    private_latency_ms: Optional[float] = None
    tools_installed: Dict[str, bool]
    all_ready: bool
    max_concurrent: int
    timeout_seconds: int
    allowed_targets: List[str]
    active_execution: Optional[Dict[str, Any]] = None
