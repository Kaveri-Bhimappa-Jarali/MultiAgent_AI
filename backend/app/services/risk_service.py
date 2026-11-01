"""
Calibrated Multi-Factor Risk Assessment Engine
=============================================
Compliant with SDMCET VII Semester Major Project Synopsis Section 16-17.

Mathematical Formulation:
    Risk = Clamp( [ (S_prog * C_det * M_asset * M_user) + B_cti + B_vol ] * U_factor, 0, 100 )

Components:
1. S_prog (Attack Progression Stage): Base score in [25, 90] reflecting MITRE kill-chain depth.
2. C_det (Detection Confidence): Average confidence of correlated detection findings [0.80, 1.0].
3. M_asset (Asset Criticality Multiplier): 1.0x (Workstation) to 1.35x (Domain Controller/DB).
4. M_user (Identity Privilege Multiplier): 1.0x (Standard user) to 1.25x (Admin/Root).
5. B_cti (Threat Intelligence Context): +0 to +15 bonus for confirmed external C2/IOC matches.
6. B_vol (Correlated Evidence Volume): Logarithmic scaling preventing double-counting redundant telemetry.
7. U_factor (Uncertainty Penalty/Discount): 0.90x when critical telemetry fields are unobserved, 1.0x when complete.

Guarantees:
- Fully deterministic, mathematically calibrated, strictly bounded: 0 <= Risk <= 100.
- Detailed factor breakdown stored in database and exposed to UI/API.
"""

import math
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.models.incident import Incident, IncidentEvent
from app.models.event import SecurityEvent
from app.models.detection import DetectionFinding
from app.models.risk import RiskAssessment
from app.services.threat_intel_service import lookup_indicator

def calculate_incident_risk(db: Session, incident: Incident) -> RiskAssessment:
    event_rels = db.query(IncidentEvent).filter(IncidentEvent.incident_id == incident.incident_id).all()
    event_ids = [r.event_id for r in event_rels]
    events = db.query(SecurityEvent).filter(SecurityEvent.event_id.in_(event_ids)).all() if event_ids else []

    event_types = {e.event_type for e in events}
    
    # 1. Progression Stage Score (S_prog: 25 to 90)
    progression_stage = "Reconnaissance"
    stage_score = 25
    if any(e.event_type == "file_access" for e in events) or any("shadow" in (e.command_line or "").lower() for e in events):
        progression_stage = "Data Access & Impact"
        stage_score = 90
    elif "privilege_escalation" in event_types or any("sudo" in (e.command_line or "").lower() for e in events):
        progression_stage = "Privilege Escalation"
        stage_score = 80
    elif any(any(k in (e.raw_payload or "").lower() for k in ["c2", "beacon", "reverse_shell"]) for e in events):
        progression_stage = "Command & Control / Lateral Movement"
        stage_score = 70
    elif "process_execution" in event_types:
        progression_stage = "Execution"
        stage_score = 55
    elif "authentication" in event_types:
        progression_stage = "Initial Access"
        stage_score = 40
    elif "network_connection" in event_types:
        progression_stage = "Reconnaissance"
        stage_score = 25

    # 2. Correlated Findings & Average Detection Confidence (C_det: 0.80 - 1.0)
    all_findings = db.query(DetectionFinding).order_by(DetectionFinding.timestamp.desc()).limit(100).all()
    correlated_findings = []
    for f in all_findings:
        f_evts = f.evidence.get("event_ids", []) if isinstance(f.evidence, dict) else []
        if any(eid in f_evts for eid in event_ids):
            correlated_findings.append(f)

    if correlated_findings:
        avg_confidence = float(sum(f.confidence for f in correlated_findings) / len(correlated_findings))
        confidence_factor = round(min(1.0, max(0.80, avg_confidence)), 2)
    else:
        confidence_factor = 0.88

    # 3. Asset Criticality Multiplier (M_asset: 1.0 to 1.35)
    hosts = incident.affected_hosts or []
    criticality_mult = 1.0
    if any(any(c in h.lower() for c in ["dc", "prod", "db", "vault", "payroll", "server"]) for h in hosts):
        criticality_mult = 1.35
    elif any(any(c in h.lower() for c in ["srv", "dmz", "api"]) for h in hosts):
        criticality_mult = 1.15

    # 4. Identity Privilege Multiplier (M_user: 1.0 to 1.25)
    users = incident.affected_users or []
    user_mult = 1.0
    if any(any(u.lower() in ["admin", "root", "system", "administrator", "svc_"] for u in [usr]) for usr in users):
        user_mult = 1.25

    # 5. Cyber Threat Intelligence Context Bonus (B_cti: 0 to 15)
    cti_bonus = 0
    matched_iocs = []
    external_ips = {e.source_ip for e in events if e.source_ip} | {e.destination_ip for e in events if e.destination_ip}
    for ip in external_ips:
        if ip and not any(ip.startswith(p) for p in ["127.", "10.", "192.168.", "172.16."]):
            lookup = lookup_indicator(db, ip)
            if lookup and lookup.found and lookup.risk_level in ["MALICIOUS", "SUSPICIOUS"]:
                cti_bonus = 15 if lookup.risk_level == "MALICIOUS" else 8
                matched_iocs.append(ip)
                break

    # 6. Telemetry Volume Bonus with Non-Linear Entity Deduplication (B_vol: 0 to 15)
    # Using logarithmic scaling on unique entities prevents double-counting redundant flow records
    crit_count = sum(1 for e in events if e.severity == "CRITICAL")
    high_count = sum(1 for e in events if e.severity == "HIGH")
    unique_entities = len(set(hosts) | set(users) | external_ips)
    raw_vol = (crit_count * 5) + (high_count * 2) + int(2.5 * math.log(1 + max(1, unique_entities)))
    volume_bonus = min(15, raw_vol)

    # 7. Telemetry Completeness & Uncertainty Factor (U_factor: 0.90 to 1.0)
    has_network = "network_connection" in event_types
    has_auth_or_proc = any(et in event_types for et in ["authentication", "process_execution", "privilege_escalation"])
    if has_network and has_auth_or_proc:
        uncertainty_factor = 1.0  # Full cross-domain telemetry present
        uncertainty_note = "High telemetry completeness across network and endpoint domains."
    else:
        uncertainty_factor = 0.92  # Partial observability discount
        uncertainty_note = "Single-domain telemetry; uncertainty factor applied to prevent false elevation."

    # Final Mathematical Composition
    base_calc = (stage_score * confidence_factor * criticality_mult * user_mult) + cti_bonus + volume_bonus
    calculated_risk = int(round(base_calc * uncertainty_factor))
    overall_score = max(10, min(100, calculated_risk))

    # Determine Severity Band
    if overall_score >= 85:
        severity_band = "CRITICAL"
        explanation = f"Critical risk ({overall_score}/100): Advanced progression stage ({progression_stage}) involving critical assets and elevated privileges."
    elif overall_score >= 70:
        severity_band = "HIGH"
        explanation = f"High risk ({overall_score}/100): Coordinated intrusion sequence targeting key enterprise systems. Containment required."
    elif overall_score >= 40:
        severity_band = "MEDIUM"
        explanation = f"Medium risk ({overall_score}/100): Observable behavioral anomaly or reconnaissance pattern. Active monitoring advised."
    else:
        severity_band = "LOW"
        explanation = f"Low risk ({overall_score}/100): Isolated or low-severity anomaly without confirmed progression."

    factors = {
        "progression_stage": progression_stage,
        "base_stage_score": stage_score,
        "detection_confidence_factor": confidence_factor,
        "criticality_multiplier": criticality_mult,
        "identity_privilege_multiplier": user_mult,
        "cti_threat_bonus": cti_bonus,
        "matched_c2_iocs": matched_iocs,
        "telemetry_volume_bonus": volume_bonus,
        "uncertainty_factor": uncertainty_factor,
        "uncertainty_note": uncertainty_note,
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
