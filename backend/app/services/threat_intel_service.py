from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.models.threat_intel import ThreatIndicator
from app.schemas.threat_intel import ThreatLookupResponse, ThreatIndicatorResponse
from typing import Optional

SAMPLE_THREAT_INDICATORS = [
    {
        "indicator_type": "IP",
        "indicator_value": "198.51.100.23",
        "threat_name": "Cobalt Strike Team Server",
        "threat_actor": "APT29 (Cozy Bear)",
        "confidence": 0.95,
        "severity": "CRITICAL",
        "tags": ["C2", "CobaltStrike", "Beacon", "HighConfidence"],
        "description": "Observed active command and control beacon destination associated with credential theft campaigns."
    },
    {
        "indicator_type": "IP",
        "indicator_value": "203.0.113.88",
        "threat_name": "Emotet Botnet Relay",
        "threat_actor": "TA542",
        "confidence": 0.88,
        "severity": "HIGH",
        "tags": ["Botnet", "Malware", "Phishing"],
        "description": "Known malicious proxy relay node for banking trojans and second-stage dropper distribution."
    },
    {
        "indicator_type": "IP",
        "indicator_value": "192.0.2.144",
        "threat_name": "Distributed Mass Port Scanner",
        "threat_actor": "ShadowScan Cluster",
        "confidence": 0.92,
        "severity": "MEDIUM",
        "tags": ["Reconnaissance", "PortScan", "Nmap"],
        "description": "High-volume reconnaissance host scanning subnets for exposed SSH and SMB ports."
    },
    {
        "indicator_type": "DOMAIN",
        "indicator_value": "update-service-cloud.xyz",
        "threat_name": "Typosquatting C2 Domain",
        "threat_actor": "Lazarus Group",
        "confidence": 0.94,
        "severity": "CRITICAL",
        "tags": ["DNS", "Exfiltration", "Typosquat"],
        "description": "Dynamic DNS node simulating cloud infrastructure for data staging and exfiltration."
    },
    {
        "indicator_type": "SHA256",
        "indicator_value": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "threat_name": "Living-Off-The-Land Payload Loader",
        "threat_actor": "FIN7",
        "confidence": 0.98,
        "severity": "CRITICAL",
        "tags": ["Dropper", "PowerShell", "Ransomware"],
        "description": "Obfuscated PowerShell loader script designed to execute in-memory shellcode."
    }
]

def seed_threat_intelligence(db: Session):
    for item in SAMPLE_THREAT_INDICATORS:
        existing = db.query(ThreatIndicator).filter(ThreatIndicator.indicator_value == item["indicator_value"]).first()
        if not existing:
            indicator = ThreatIndicator(
                indicator_type=item["indicator_type"],
                indicator_value=item["indicator_value"],
                threat_name=item["threat_name"],
                threat_actor=item["threat_actor"],
                confidence=item["confidence"],
                severity=item["severity"],
                tags=item["tags"],
                description=item["description"],
                first_seen=datetime.now(timezone.utc),
                last_seen=datetime.now(timezone.utc)
            )
            db.add(indicator)
    db.commit()

def lookup_indicator(db: Session, indicator_str: str) -> ThreatLookupResponse:
    cleaned = indicator_str.strip()
    match = db.query(ThreatIndicator).filter(ThreatIndicator.indicator_value == cleaned).first()
    
    if match:
        rec_score = int(match.confidence * 100)
        risk = "MALICIOUS" if match.severity in ["CRITICAL", "HIGH"] else "SUSPICIOUS"
        recs = [
            f"Block communications with {match.indicator_value} on perimeter firewall",
            f"Review historical flow records for interactions with this {match.indicator_type.lower()}",
            f"Flag associated endpoint for detailed EDR memory and disk forensics"
        ]
        return ThreatLookupResponse(
            indicator=cleaned,
            found=True,
            source="LOCAL_CTI_DATABASE (Curated Enterprise Threat Feed)",
            threat_details=ThreatIndicatorResponse.model_validate(match),
            reputation_score=rec_score,
            risk_level=risk,
            recommendations=recs
        )
    else:
        # Check heuristics (e.g. private RFC1918 vs unknown external)
        is_private = any(cleaned.startswith(p) for p in ["10.", "192.168.", "172.16.", "127."])
        risk = "SAFE" if is_private else "UNKNOWN"
        recs = [
            "No active CTI alerts found in current local database",
            "Monitor ongoing network flows and host behavior"
        ]
        return ThreatLookupResponse(
            indicator=cleaned,
            found=False,
            source="LOCAL_CTI_DATABASE (Curated Enterprise Threat Feed)",
            threat_details=None,
            reputation_score=10 if is_private else 45,
            risk_level=risk,
            recommendations=recs
        )
