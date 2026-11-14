from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models.incident import Incident, IncidentEvent, IncidentNote, IncidentAudit
from app.models.event import SecurityEvent
from app.models.risk import RiskAssessment
from app.models.response import ResponseAction, VerificationResult
from app.models.agent import AgentFinding
from app.schemas.incident import (
    IncidentResponse, IncidentDetailResponse, IncidentStatusUpdate,
    IncidentNoteCreate, IncidentNoteResponse
)
from app.schemas.event import SecurityEventResponse
from app.services.risk_service import calculate_incident_risk
from app.agents.orchestrator import MultiAgentSOCEngine
from app.services.time_utils import utc_isoformat

router = APIRouter(prefix="/incidents", tags=["Incidents"])
correlation_router = APIRouter(tags=["Correlation"])

@router.get("", response_model=List[IncidentResponse])
@router.get("/", response_model=List[IncidentResponse])
def list_incidents(
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    is_simulated: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(Incident)
    if severity:
        query = query.filter(Incident.severity == severity.upper())
    if status:
        query = query.filter(Incident.status == status.upper())
    if is_simulated is not None:
        query = query.filter(Incident.is_simulated == is_simulated)
    incidents = query.order_by(Incident.created_at.desc()).limit(limit).all()
    return [IncidentResponse.model_validate(i) for i in incidents]

# Correlation alias routes so /api/correlation and /api/correlations work out of the box
@correlation_router.get("/correlation", response_model=List[IncidentResponse])
@correlation_router.get("/correlation/", response_model=List[IncidentResponse])
@correlation_router.get("/correlations", response_model=List[IncidentResponse])
@correlation_router.get("/correlations/", response_model=List[IncidentResponse])
def list_correlations(
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    is_simulated: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    return list_incidents(severity=severity, status=status, is_simulated=is_simulated, limit=limit, db=db)

@correlation_router.get("/correlation/{incident_id}", response_model=IncidentDetailResponse)
@correlation_router.get("/correlations/{incident_id}", response_model=IncidentDetailResponse)
def get_correlation_detail(incident_id: str, db: Session = Depends(get_db)):
    return get_incident_detail(incident_id=incident_id, db=db)

@router.get("/{incident_id}", response_model=IncidentDetailResponse)
def get_incident_detail(incident_id: str, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Associated events
    event_rels = db.query(IncidentEvent).filter(IncidentEvent.incident_id == incident_id).order_by(IncidentEvent.sequence_order).all()
    event_ids = [r.event_id for r in event_rels]
    events = db.query(SecurityEvent).filter(SecurityEvent.event_id.in_(event_ids)).all() if event_ids else []
    
    # Sort events chronologically
    sorted_events = sorted(events, key=lambda x: x.timestamp or x.created_at)

    # Notes
    notes = db.query(IncidentNote).filter(IncidentNote.incident_id == incident_id).order_by(IncidentNote.created_at.desc()).all()

    # Risk Assessment
    risk = db.query(RiskAssessment).filter(RiskAssessment.incident_id == incident_id).first()
    risk_dict = None
    if risk:
        risk_dict = {
            "overall_score": risk.overall_score,
            "severity_band": risk.severity_band,
            "progression_stage": risk.progression_stage,
            "criticality_multiplier": risk.criticality_multiplier,
            "factors": risk.factors,
            "explanation": risk.explanation,
            "assessed_at": utc_isoformat(risk.assessed_at)
        }

    # Response Actions
    resp_actions = db.query(ResponseAction).filter(ResponseAction.incident_id == incident_id).all()
    resp_list = [
        {
            "action_id": r.action_id,
            "action_type": r.action_type,
            "target_type": r.target_type,
            "target_value": r.target_value,
            "reason": r.reason,
            "expected_effect": r.expected_effect,
            "status": r.status,
            "is_dry_run": r.is_dry_run,
            "requires_approval": r.requires_approval,
            "approved_by": r.approved_by,
            "approved_at": utc_isoformat(r.approved_at) if r.approved_at else None,
            "execution_result": r.execution_result,
            "executed_at": utc_isoformat(r.executed_at) if r.executed_at else None
        } for r in resp_actions
    ]

    # Verification Results
    ver_results = db.query(VerificationResult).filter(VerificationResult.incident_id == incident_id).all()
    ver_list = [
        {
            "verification_id": v.verification_id,
            "action_id": v.action_id,
            "verification_status": v.verification_status,
            "checks_performed": v.checks_performed,
            "observed_events_count": v.observed_events_count,
            "evidence_summary": v.evidence_summary,
            "verified_at": utc_isoformat(v.verified_at)
        } for v in ver_results
    ]

    # Audits
    audits = db.query(IncidentAudit).filter(IncidentAudit.incident_id == incident_id).order_by(IncidentAudit.timestamp.desc()).all()
    audit_list = [
        {
            "actor": a.actor,
            "action": a.action,
            "previous_state": a.previous_state,
            "new_state": a.new_state,
            "timestamp": utc_isoformat(a.timestamp)
        } for a in audits
    ]

    # Agent Findings linked to this incident via IncidentFinding or AgentFinding.incident_id
    from app.models.incident import IncidentFinding
    inc_finding_rels = db.query(IncidentFinding).filter(IncidentFinding.incident_id == incident_id).all()
    inc_finding_ids = {r.finding_id for r in inc_finding_rels}

    agent_findings = db.query(AgentFinding).filter(
        (AgentFinding.incident_id == incident_id) |
        (AgentFinding.finding_id.in_(inc_finding_ids))
    ).order_by(AgentFinding.created_at.asc()).all()

    findings_list = [
        {
            "finding_id": f.finding_id,
            "agent_name": f.agent_name,
            "incident_id": f.incident_id,
            "title": f.title,
            "severity": f.severity,
            "confidence": f.confidence,
            "description": f.description,
            "evidence": f.evidence,
            "source_event_ids": f.source_event_ids or [],
            "recommendations": f.recommendations,
            "created_at": utc_isoformat(f.created_at)
        } for f in agent_findings
    ]

    detail = IncidentDetailResponse.model_validate(inc)
    detail.events = [SecurityEventResponse.model_validate(e) for e in sorted_events]
    detail.notes = [IncidentNoteResponse.model_validate(n) for n in notes]
    detail.risk_assessment = risk_dict
    detail.response_actions = resp_list
    detail.verification_results = ver_list
    detail.audits = audit_list
    detail.agent_findings = findings_list

    return detail

@router.post("/{incident_id}/investigate")
def trigger_incident_investigation(incident_id: str, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    engine = MultiAgentSOCEngine(db)
    result = engine.run_pipeline(incident_id=incident_id)
    # Re-calculate risk score
    calculate_incident_risk(db, inc)
    return {"message": "Incident investigation completed", "result": result}

@router.patch("/{incident_id}/status")
def update_incident_status(incident_id: str, payload: IncidentStatusUpdate, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    prev_status = inc.status
    if payload.status:
        inc.status = payload.status.upper()
    if payload.assigned_analyst:
        inc.assigned_analyst = payload.assigned_analyst

    inc.updated_at = datetime.now(timezone.utc)

    # Add audit log
    db.add(IncidentAudit(
        incident_id=incident_id,
        actor=payload.assigned_analyst or "SOC Analyst",
        action="STATUS_UPDATED",
        previous_state=prev_status,
        new_state=inc.status,
        timestamp=datetime.now(timezone.utc)
    ))

    # Add note if provided
    if payload.note:
        db.add(IncidentNote(
            incident_id=incident_id,
            author=payload.assigned_analyst or "SOC Analyst",
            note=payload.note,
            created_at=datetime.now(timezone.utc)
        ))

    db.commit()
    return {"message": "Incident updated successfully", "incident_id": incident_id, "status": inc.status}

@router.post("/{incident_id}/notes", response_model=IncidentNoteResponse)
def add_incident_note(incident_id: str, note_req: IncidentNoteCreate, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    new_note = IncidentNote(
        incident_id=incident_id,
        author="SOC Analyst",
        note=note_req.note,
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_note)
    db.commit()
    return IncidentNoteResponse.model_validate(new_note)
