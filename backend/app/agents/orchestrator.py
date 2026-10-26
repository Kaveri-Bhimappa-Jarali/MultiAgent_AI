import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.event import SecurityEvent
from app.models.incident import Incident
from app.agents.network_agent import NetworkMonitoringAgent
from app.agents.auth_agent import AuthenticationAgent
from app.agents.endpoint_agent import EndpointAgent
from app.agents.malicious_behaviour_agent import MaliciousBehaviourAgent
from app.agents.anomaly_detection_agent import AnomalyDetectionAgent
from app.agents.threat_intel_agent import ThreatIntelligenceAgent
from app.agents.correlation_agent import CorrelationAgent
from app.agents.attack_path_agent import AttackPathAgent
from app.agents.investigation_agent import InvestigationAgent
from app.agents.response_agent import ResponseAgent

AGENT_REGISTRY = {
    "Network Monitoring Agent": NetworkMonitoringAgent,
    "Authentication Agent": AuthenticationAgent,
    "Endpoint Agent": EndpointAgent,
    "Malicious Behaviour Agent": MaliciousBehaviourAgent,
    "Anomaly Detection Agent": AnomalyDetectionAgent,
    "Threat Intelligence Agent": ThreatIntelligenceAgent,
    "Correlation Agent": CorrelationAgent,
    "Attack-Path Analysis Agent": AttackPathAgent,
    "Investigation Agent": InvestigationAgent,
    "Response Agent": ResponseAgent,
}

class MultiAgentSOCEngine:
    def __init__(self, db: Session):
        self.db = db

    def run_pipeline(
        self,
        events: Optional[List[SecurityEvent]] = None,
        incident_id: Optional[str] = None,
        agent_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Coordinates execution of the multi-agent SOC pipeline.
        Passes shared context, runs agents in dependency sequence, records telemetries.
        """
        batch_id = f"BATCH-{uuid.uuid4().hex[:8].upper()}"
        
        # Load events if not directly provided
        if events is None:
            if incident_id:
                # Load events for incident
                inc = self.db.query(Incident).filter(Incident.incident_id == incident_id).first()
                if inc:
                    from app.models.incident import IncidentEvent
                    event_rels = self.db.query(IncidentEvent).filter(IncidentEvent.incident_id == incident_id).all()
                    event_ids = [r.event_id for r in event_rels]
                    events = self.db.query(SecurityEvent).filter(SecurityEvent.event_id.in_(event_ids)).all()
                else:
                    events = []
            else:
                # Load latest 100 unprocessed or recent events
                events = self.db.query(SecurityEvent).order_by(SecurityEvent.timestamp.desc()).limit(100).all()

        shared_context = {
            "batch_id": batch_id,
            "incident_id": incident_id,
            "events": events,
            "summary": f"Pipeline execution over {len(events)} events (Incident: {incident_id or 'General'})"
        }

        agent_results = []
        agents_to_run = []

        if agent_filter and agent_filter in AGENT_REGISTRY:
            agents_to_run = [AGENT_REGISTRY[agent_filter]]
        else:
            # Full canonical sequence
            agents_to_run = [
                NetworkMonitoringAgent,
                AuthenticationAgent,
                EndpointAgent,
                MaliciousBehaviourAgent,
                AnomalyDetectionAgent,
                ThreatIntelligenceAgent,
                CorrelationAgent,
                AttackPathAgent,
                InvestigationAgent,
                ResponseAgent
            ]

        for AgentClass in agents_to_run:
            agent_instance = AgentClass(self.db)
            res = agent_instance.execute(shared_context)
            agent_results.append(res)

        return {
            "batch_id": batch_id,
            "events_evaluated": len(events),
            "agents_executed": len(agent_results),
            "pipeline_status": "COMPLETED",
            "results": agent_results
        }

    def dispatch_event_driven_pipeline(
        self,
        event: SecurityEvent,
        findings: Optional[List[Any]] = None
    ) -> Dict[str, Any]:
        """
        Event-driven selective execution: Triggers only the relevant specialized agents
        for an incoming event and any generated findings, preventing wasted cycles and recursive loops.
        """
        from app.services.broadcaster import broadcaster

        batch_id = f"EVT-TRIGGER-{uuid.uuid4().hex[:6].upper()}"
        agent_results = []
        
        # Load related recent events for context
        recent_events = self.db.query(SecurityEvent).filter(
            (SecurityEvent.source_ip == event.source_ip) |
            (SecurityEvent.username == event.username) |
            (SecurityEvent.host == event.host)
        ).order_by(SecurityEvent.timestamp.desc()).limit(20).all()

        shared_context = {
            "batch_id": batch_id,
            "events": recent_events or [event],
            "primary_event": event,
            "findings": findings or [],
            "summary": f"Selective real-time pipeline triggered by event {event.event_id} ({event.event_type})"
        }

        # 1. Determine Domain Agent based on event type
        domain_agents = []
        if event.event_type == "authentication":
            domain_agents.append(AuthenticationAgent)
        elif event.event_type == "network_connection":
            domain_agents.append(NetworkMonitoringAgent)
        elif event.event_type in ["process_execution", "file_access", "privilege_escalation"]:
            domain_agents.append(EndpointAgent)

        # 2. Anomaly agent if ML finding or notable score
        if any(f.detection_method == "ANOMALY_DETECTION" for f in (findings or [])):
            domain_agents.append(AnomalyDetectionAgent)

        # 3. Threat Intel agent if external observable exists
        if event.source_ip and not any(event.source_ip.startswith(p) for p in ["127.", "10.", "192.168."]):
            domain_agents.append(ThreatIntelligenceAgent)

        # Execute selected domain agents
        for AgentCls in domain_agents:
            agent = AgentCls(self.db)
            broadcaster.publish_sync("AGENT_STATUS_CHANGED", {
                "name": agent.name,
                "status": "RUNNING",
                "event_id": event.event_id
            })
            res = agent.execute(shared_context)
            agent_results.append(res)
            broadcaster.publish_sync("AGENT_STATUS_CHANGED", {
                "name": agent.name,
                "status": res["status"],
                "duration_ms": res.get("duration_ms", 0),
                "findings_count": len(res.get("findings", []))
            })

        # 4. Correlation Agent if findings were produced or event is HIGH/CRITICAL
        has_threat = (findings and len(findings) > 0) or event.severity in ["HIGH", "CRITICAL"]
        if has_threat:
            corr_agent = CorrelationAgent(self.db)
            corr_res = corr_agent.execute(shared_context)
            agent_results.append(corr_res)

            incident_ids = corr_res.get("data", {}).get("incident_ids", [])
            for inc_id in incident_ids:
                # Run Attack Path, Investigation, Response for created/updated incident
                shared_context["incident_id"] = inc_id

                path_agent = AttackPathAgent(self.db)
                agent_results.append(path_agent.execute(shared_context))

                inv_agent = InvestigationAgent(self.db)
                agent_results.append(inv_agent.execute(shared_context))

                resp_agent = ResponseAgent(self.db)
                agent_results.append(resp_agent.execute(shared_context))

                # Recalculate risk score
                inc = self.db.query(Incident).filter(Incident.incident_id == inc_id).first()
                if inc:
                    from app.services.risk_service import calculate_incident_risk
                    calculate_incident_risk(self.db, inc)
                    broadcaster.publish_sync("INCIDENT_UPDATED", {
                        "incident_id": inc.incident_id,
                        "title": inc.title,
                        "severity": inc.severity,
                        "risk_score": inc.risk_score,
                        "status": inc.status,
                        "event_count": inc.event_count
                    })

        return {
            "batch_id": batch_id,
            "agents_executed": len(agent_results),
            "results": agent_results
        }

