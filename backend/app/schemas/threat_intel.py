from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class ThreatIndicatorResponse(BaseModel):
    id: int
    indicator_type: str
    indicator_value: str
    threat_name: str
    threat_actor: str
    confidence: float
    severity: str
    tags: List[str]
    description: Optional[str]
    first_seen: datetime
    last_seen: datetime

    class Config:
        from_attributes = True

class ThreatLookupRequest(BaseModel):
    indicator: str

class ThreatLookupResponse(BaseModel):
    indicator: str
    found: bool
    source: str  # "LOCAL_CTI_DATABASE" or "EXTERNAL_FEED"
    threat_details: Optional[ThreatIndicatorResponse] = None
    reputation_score: int  # 0 to 100
    risk_level: str  # SAFE, SUSPICIOUS, MALICIOUS, UNKNOWN
    recommendations: List[str] = []
