from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Dict, Any, List
from app.models.incident import Incident, IncidentEvent
from app.models.event import SecurityEvent
from app.models.risk import RiskAssessment

def calculate_incident_risk(db: Session, incident: Incident) -> RiskAssessment:
    """
    Transparent, deterministic 0-100 risk scoring algorithm based on:
    - Attack lifecycle progression stage
    - Volume of correlated telemetry signals
    - Criticality of involved host assets & identities
    - Anomaly indicators and confidence
    """
    event_rels = db.query(IncidentEvent).filter(IncidentEvent.incident_id == incident.incident_id).all()
    event_ids = [r.event_id for r in event_rels]
    events = db.query(SecurityEvent).filter(SecurityEvent.event_id.in_(event_ids)).all() if event_ids else []

    event_types = {e.event_type for e in events}
    
    # 1. Progression Stage Score (Base 20-95)
    progression_stage = "Reconnaissance"
    stage_score = 25
    if any(e.event_type == "file_access" for e in events) or any("shadow" in (e.command_line or "").lower() for e in events):
        progression_stage = "Data Access & Impact"
        stage_score = 88
    elif "privilege_escalation" in event_types or any("sudo" in (e.command_line or "").lower() for e in events):
        progression_stage = "Privilege Escalation"
        stage_score = 75
    elif "process_execution" in event_types:
        progression_stage = "Execution"
        stage_score = 60
    elif "authentication" in event_types:
        progression_stage = "Initial Access"
        stage_score = 45
    elif "network_connection" in event_types:
        progression_stage = "Reconnaissance"
        stage_score = 30

    # 2. Asset Criticality Multiplier
    hosts = incident.affected_hosts or []
    criticality_mult = 1.0
    if any(any(c in h.lower() for c in ["dc", "prod", "db", "vault", "payroll"]) for h in hosts):
        criticality_mult = 1.35
    elif any("srv" in h.lower() for h in hosts):
        criticality_mult = 1.15

    # 3. Account Privilege Factor
    users = incident.affected_users or []
    user_mult = 1.0
    if any(any(u.lower() in ["admin", "root", "system", "administrator", "svc_"] for u in [usr]) for usr in users):
        user_mult = 1.25

    # 4. Telemetry Volume & Severity Factor
    crit_count = sum(1 for e in events if e.severity == "CRITICAL")
    high_count = sum(1 for e in events if e.severity == "HIGH")
    volume_bonus = min(20, (crit_count * 8) + (high_count * 4) + (len(events) * 1))

    # Calculate raw score
    raw_score = (stage_score * criticality_mult * user_mult) + volume_bonus
    overall_score = int(min(100, max(15, raw_score)))

    # Determine Severity Band
    if overall_score >= 85:
        severity_band = "CRITICAL"
        explanation = f"Critical risk ({overall_score}/100): High progression stage ({progression_stage}) involving critical assets and elevated privileges. Immediate containment prioritized."
    elif overall_score >= 70:
        severity_band = "HIGH"
        explanation = f"High risk ({overall_score}/100): Multi-stage intrusion sequence targeting key internal systems. Containment actions recommended."
    elif overall_score >= 40:
        severity_band = "MEDIUM"
        explanation = f"Medium risk ({overall_score}/100): Suspicious behavioral anomaly or reconnaissance pattern. Active monitoring and investigation advised."
    else:
        severity_band = "LOW"
        explanation = f"Low risk ({overall_score}/100): Isolated or low-severity anomaly without confirmed escalation."

    factors = {
        "progression_stage": progression_stage,
        "base_stage_score": stage_score,
        "criticality_multiplier": criticality_mult,
        "identity_privilege_multiplier": user_mult,
        "telemetry_volume_bonus": volume_bonus,
        "critical_events_count": crit_count,
        "high_events_count": high_count,
        "total_events_correlated": len(events)
    }

    # Save or update risk assessment
    assessment = db.query(RiskAssessment).filter(RiskAssessment.incident_id == incident.incident_id).first()
    if not assessment:
        assessment = RiskAssessment(
            incident_id=incident.incident_id,
            overall_score=overall_score,
            severity_band=severity_band,
            progression_stage=progression_stage,
            criticality_multiplier=criticality_mult,
            factors=factors,
            explanation=explanation,
            assessed_at=datetime.now(timezone.utc)
        )
        db.add(assessment)
    else:
        assessment.overall_score = overall_score
        assessment.severity_band = severity_band
        assessment.progression_stage = progression_stage
        assessment.criticality_multiplier = criticality_mult
        assessment.factors = factors
        assessment.explanation = explanation
        assessment.assessed_at = datetime.now(timezone.utc)

    # Sync incident risk score and severity
    incident.risk_score = overall_score
    incident.severity = severity_band
    db.commit()

    return assessment
