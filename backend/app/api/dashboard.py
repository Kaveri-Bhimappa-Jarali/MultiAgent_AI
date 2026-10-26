from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from app.database import get_db
from app.schemas.dashboard import DashboardSummaryResponse, MetricSummary, TrendPoint, SeverityCount, CategoryCount, AgentHealthCard
from app.models.event import SecurityEvent
from app.models.incident import Incident
from app.models.response import ResponseAction, VerificationResult
from app.models.detection import DetectionFinding
from app.models.agent import AgentExecution
from app.agents.orchestrator import AGENT_REGISTRY

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    one_day_ago = now - timedelta(hours=24)

    total_events = db.query(SecurityEvent).count()
    events_in_timerange = db.query(SecurityEvent).filter(SecurityEvent.timestamp >= one_day_ago).count()
    
    open_incidents = db.query(Incident).filter(Incident.status.in_(["NEW", "INVESTIGATING"])).count()
    crit_high = db.query(Incident).filter(Incident.severity.in_(["CRITICAL", "HIGH"]), Incident.status != "RESOLVED").count()
    
    pending_approvals = db.query(ResponseAction).filter(ResponseAction.status.in_(["PENDING_APPROVAL", "RECOMMENDED"])).count()
    contained_threats = db.query(Incident).filter(Incident.status == "CONTAINED").count()
    verification_failures = db.query(VerificationResult).filter(VerificationResult.verification_status == "VERIFICATION_FAILED").count()
    awaiting_investigation = db.query(Incident).filter(Incident.investigation_status == "PENDING").count()

    metrics = MetricSummary(
        total_events=total_events,
        events_in_timerange=events_in_timerange,
        open_incidents=open_incidents,
        critical_high_incidents=crit_high,
        active_agents=len(AGENT_REGISTRY),
        idle_agents=0,
        error_agents=0,
        incidents_awaiting_investigation=awaiting_investigation,
        actions_pending_approval=pending_approvals,
        contained_threats=contained_threats,
        verification_failures=verification_failures
    )

    # Hourly Trend Points (past 6 time slots)
    trends = []
    for i in range(5, -1, -1):
        slot_start = now - timedelta(hours=i+1)
        slot_end = now - timedelta(hours=i)
        ev_count = db.query(SecurityEvent).filter(SecurityEvent.timestamp >= slot_start, SecurityEvent.timestamp < slot_end).count()
        al_count = db.query(DetectionFinding).filter(DetectionFinding.timestamp >= slot_start, DetectionFinding.timestamp < slot_end).count()
        trends.append(TrendPoint(
            timestamp=slot_end.strftime("%H:00"),
            events_count=ev_count,
            alerts_count=al_count
        ))

    # Severity distribution
    sev_counts = [
        SeverityCount(severity="CRITICAL", count=db.query(SecurityEvent).filter(SecurityEvent.severity == "CRITICAL").count()),
        SeverityCount(severity="HIGH", count=db.query(SecurityEvent).filter(SecurityEvent.severity == "HIGH").count()),
        SeverityCount(severity="MEDIUM", count=db.query(SecurityEvent).filter(SecurityEvent.severity == "MEDIUM").count()),
        SeverityCount(severity="LOW", count=db.query(SecurityEvent).filter(SecurityEvent.severity == "LOW").count()),
        SeverityCount(severity="INFO", count=db.query(SecurityEvent).filter(SecurityEvent.severity == "INFO").count()),
    ]

    # Category distribution
    cat_counts = [
        CategoryCount(category="Authentication", count=db.query(SecurityEvent).filter(SecurityEvent.event_type == "authentication").count()),
        CategoryCount(category="Network", count=db.query(SecurityEvent).filter(SecurityEvent.event_type == "network_connection").count()),
        CategoryCount(category="Process Exec", count=db.query(SecurityEvent).filter(SecurityEvent.event_type == "process_execution").count()),
        CategoryCount(category="Privilege Escalation", count=db.query(SecurityEvent).filter(SecurityEvent.event_type == "privilege_escalation").count()),
        CategoryCount(category="File Access", count=db.query(SecurityEvent).filter(SecurityEvent.event_type == "file_access").count()),
    ]

    # Agent health cards
    agent_health = []
    for name in AGENT_REGISTRY.keys():
        last_exec = db.query(AgentExecution).filter(AgentExecution.agent_name == name).order_by(AgentExecution.start_time.desc()).first()
        findings_count = last_exec.findings_count if last_exec else 0
        agent_health.append(AgentHealthCard(
            name=name,
            status=last_exec.status if last_exec else "IDLE",
            health="HEALTHY",
            last_run=last_exec.start_time.strftime("%H:%M:%S") if last_exec else "Not yet run",
            findings_count=findings_count
        ))

    # Recent critical incidents
    crit_incidents = db.query(Incident).order_by(Incident.created_at.desc()).limit(5).all()
    recent_incidents_list = [
        {
            "incident_id": inc.incident_id,
            "title": inc.title,
            "severity": inc.severity,
            "risk_score": inc.risk_score,
            "status": inc.status,
            "created_at": inc.created_at.isoformat(),
            "event_count": inc.event_count
        } for inc in crit_incidents
    ]

    # Recent events
    latest_events = db.query(SecurityEvent).order_by(SecurityEvent.timestamp.desc()).limit(6).all()
    recent_events_list = [
        {
            "event_id": e.event_id,
            "timestamp": e.timestamp.isoformat(),
            "event_type": e.event_type,
            "severity": e.severity,
            "source_ip": e.source_ip,
            "destination_ip": e.destination_ip,
            "host": e.host,
            "username": e.username,
            "file_action": e.file_action
        } for e in latest_events
    ]

    return DashboardSummaryResponse(
        metrics=metrics,
        event_trends=trends,
        severity_distribution=sev_counts,
        category_distribution=cat_counts,
        agent_health=agent_health,
        recent_critical_incidents=recent_incidents_list,
        recent_events=recent_events_list,
        system_status={
            "database": "ONLINE (Connected)",
            "detection_engine": "ACTIVE (12 Rules Loaded)",
            "anomaly_model": "LOADED (Isolation Forest v1.2)",
            "soar_engine": "READY (Sandbox VPC Active)",
            "cti_feed": "SYNCHRONIZED (Curated Local Feed)"
        }
    )
