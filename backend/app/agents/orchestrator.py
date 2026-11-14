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
            "events": events or [],
            "summary": f"Pipeline execution over {len(events or [])} events (Incident: {incident_id or 'General'})"
        }

        agent_results = []

        if agent_filter and agent_filter in AGENT_REGISTRY:
            AgentClass = AGENT_REGISTRY[agent_filter]
            agent_instance = AgentClass(self.db)
            res = agent_instance.execute(shared_context)
            agent_results.append(res)
        elif incident_id:
            # Investigating an established incident
            downstream_agents = [
                AttackPathAgent,
                InvestigationAgent,
                ResponseAgent
            ]
            for AgentClass in downstream_agents:
                agent_instance = AgentClass(self.db)
                res = agent_instance.execute(shared_context)
                agent_results.append(res)

            inc = self.db.query(Incident).filter(Incident.incident_id == incident_id).first()
            if inc:
                from app.services.risk_service import calculate_incident_risk
                calculate_incident_risk(self.db, inc)
        else:
            # Full canonical sequence: Specialized detection agents first
            detection_agents = [
                NetworkMonitoringAgent,
                AuthenticationAgent,
                EndpointAgent,
                MaliciousBehaviourAgent,
                AnomalyDetectionAgent,
                ThreatIntelligenceAgent
            ]
            for AgentClass in detection_agents:
                agent_instance = AgentClass(self.db)
                res = agent_instance.execute(shared_context)
                agent_results.append(res)

            # Correlation Agent evaluates persisted findings
            corr_agent = CorrelationAgent(self.db)
            corr_res = corr_agent.execute(shared_context)
            agent_results.append(corr_res)

            # Downstream execution only for established / updated incidents
            incident_ids = corr_res.get("data", {}).get("incident_ids", [])
            for inc_id in incident_ids:
                inc_context = dict(shared_context)
                inc_context["incident_id"] = inc_id

                path_agent = AttackPathAgent(self.db)
                agent_results.append(path_agent.execute(inc_context))

                inv_agent = InvestigationAgent(self.db)
                agent_results.append(inv_agent.execute(inc_context))

                resp_agent = ResponseAgent(self.db)
                agent_results.append(resp_agent.execute(inc_context))

                inc = self.db.query(Incident).filter(Incident.incident_id == inc_id).first()
                if inc:
                    from app.services.risk_service import calculate_incident_risk
                    calculate_incident_risk(self.db, inc)

        return {
            "batch_id": batch_id,
            "events_evaluated": len(events or []),
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

        # 3. Threat Intel agent if external observable exists (source or destination IP)
        has_external_ip = (
            (event.source_ip and not any(event.source_ip.startswith(p) for p in ["127.", "10.", "192.168.", "172.16."]))
            or (event.destination_ip and not any(event.destination_ip.startswith(p) for p in ["127.", "10.", "192.168.", "172.16."]))
        )
        if has_external_ip:
            domain_agents.append(ThreatIntelligenceAgent)

        # 4. Malicious Behaviour agent if multi-stage or composite pattern observed
        all_types = {e.event_type for e in (recent_events or [event])}
        if len(all_types) >= 2 and any(t in all_types for t in ["privilege_escalation", "file_access", "process_execution"]):
            domain_agents.append(MaliciousBehaviourAgent)

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

        from app.models.agent import AgentFinding
        from app.services.time_utils import utc_isoformat

        # Collect any newly generated AgentFinding instances
        new_agent_findings = []
        for res in agent_results:
            fids = res.get("findings", [])
            if fids:
                f_objs = self.db.query(AgentFinding).filter(AgentFinding.finding_id.in_(fids)).all()
                new_agent_findings.extend(f_objs)

        # Broadcast newly generated individual agent findings to UI
        for af in new_agent_findings:
            broadcaster.publish_sync("AGENT_FINDING_RECORDED", {
                "id": af.id,
                "finding_id": af.finding_id,
                "agent_name": af.agent_name,
                "title": af.title,
                "severity": af.severity,
                "confidence": af.confidence,
                "description": af.description,
                "incident_id": af.incident_id,
                "created_at": utc_isoformat(af.created_at)
            })

        # 4. Correlation Agent evaluates persisted findings within the 900s window
        corr_agent = CorrelationAgent(self.db)
        corr_context = dict(shared_context)
        corr_context["window_seconds"] = 900
        corr_res = corr_agent.execute(corr_context)
        agent_results.append(corr_res)

        created_inc_ids = corr_res.get("data", {}).get("incidents_created", [])
        updated_inc_ids = corr_res.get("data", {}).get("incidents_updated", [])
        incident_ids = list(set(created_inc_ids + updated_inc_ids))

        # Downstream execution strictly for genuinely established or updated incidents
        for inc_id in incident_ids:
            downstream_context = dict(shared_context)
            downstream_context["incident_id"] = inc_id

            path_agent = AttackPathAgent(self.db)
            agent_results.append(path_agent.execute(downstream_context))

            inv_agent = InvestigationAgent(self.db)
            agent_results.append(inv_agent.execute(downstream_context))

            resp_agent = ResponseAgent(self.db)
            agent_results.append(resp_agent.execute(downstream_context))

            # Recalculate calibrated multi-factor risk score
            inc = self.db.query(Incident).filter(Incident.incident_id == inc_id).first()
            if inc:
                from app.services.risk_service import calculate_incident_risk
                calculate_incident_risk(self.db, inc)

                # Optional LLM Threat Reasoning Layer
                try:
                    from app.services.llm_service import analyze_threat_findings
                    llm_verdict = analyze_threat_findings(
                        self.db,
                        findings=findings or [],
                        event=event,
                        incident=inc
                    )
                    if llm_verdict.get("response_status") == "AUTONOMOUSLY_CONTAINED":
                        inc.response_status = "AUTONOMOUSLY_CONTAINED"
                        inc.status = "CONTAINED"
                    self.db.commit()
                except Exception as llm_err:
                    pass

                event_topic = "INCIDENT_CREATED" if inc_id in created_inc_ids else "INCIDENT_UPDATED"
                broadcaster.publish_sync(event_topic, {
                    "incident_id": inc.incident_id,
                    "title": inc.title,
                    "severity": inc.severity,
                    "risk_score": inc.risk_score,
                    "status": inc.status,
                    "event_count": inc.event_count,
                    "finding_count": getattr(inc, "finding_count", 0),
                    "participating_agents": getattr(inc, "participating_agents", [])
                })

        return {
            "batch_id": batch_id,
            "agents_executed": len(agent_results),
            "results": agent_results
        }

