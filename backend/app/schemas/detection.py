from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class DetectionRuleBase(BaseModel):
    rule_id: str
    name: str
    description: str
    category: str
    severity: str
    conditions: Dict[str, Any]
    threshold: int = 1
    time_window_seconds: int = 300
    mitre_technique: Optional[str] = None
    enabled: bool = True

class DetectionRuleCreate(DetectionRuleBase):
    pass

class DetectionRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    conditions: Optional[Dict[str, Any]] = None
    threshold: Optional[int] = None
    time_window_seconds: Optional[int] = None
    enabled: Optional[bool] = None

class DetectionRuleResponse(DetectionRuleBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class DetectionFindingResponse(BaseModel):
    id: int
    finding_id: str
    rule_id: Optional[str]
    rule_name: str
    detection_method: str
    severity: str
    confidence: float
    explanation: str
    evidence: Any
    next_step: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True
