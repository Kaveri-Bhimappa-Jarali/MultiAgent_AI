from pydantic import BaseModel
from typing import Dict, Any
from datetime import datetime

class RiskAssessmentResponse(BaseModel):
    id: int
    incident_id: str
    overall_score: int
    severity_band: str
    progression_stage: str
    criticality_multiplier: float
    factors: Dict[str, Any]
    explanation: str
    assessed_at: datetime

    class Config:
        from_attributes = True
