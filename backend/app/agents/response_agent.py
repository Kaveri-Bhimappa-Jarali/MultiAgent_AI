import uuid
from typing import Dict, Any, List
from datetime import datetime, timezone
from app.agents.base import BaseAgent
from app.models.incident import Incident, IncidentEvent
from app.models.event import SecurityEvent
from app.models.response import ResponseAction

class ResponseAgent(BaseAgent):
    name = "Response Agent"
    role = "SOAR Playbook & Automated Containment Specialist"
    description = "Evaluates incident risk, formulates policy-governed containment actions, and structures defensive workflows."

    def analyze(self, context: Dict[str, Any]) -> Dict[str, Any]:
        incident_id = context.get("incident_id")
        events: List[SecurityEvent] = context.get("events", [])
        
        target_inc = None
        if incident_id:
            target_inc = self.db.query(Incident).filter(Incident.incident_id == incident_id).first()
        elif events:
            rel = self.db.query(IncidentEvent).filter(IncidentEvent.event_id == events[0].event_id).first()
            if rel:
                target_inc = self.db.query(Incident).filter(Incident.incident_id == rel.incident_id).first()

        recommended_actions = []

        if target_inc:
            inc_id = target_inc.incident_id
            users = target_inc.affected_users or []
            hosts = target_inc.affected_hosts or []
            ips = target_inc.affected_ips or []

            # 1. External Attacker IP -> Firewall Block recommendation
            for ip in ips:
                if not any(ip.startswith(p) for p in ["127.", "10.0.0.", "192.168.1."]):
                    act_id = f"ACT-BLK-{uuid.uuid4().hex[:6].upper()}"
                    # Check if already generated
                    existing = self.db.query(ResponseAction).filter(
                        ResponseAction.incident_id == inc_id,
                        ResponseAction.target_value == ip
                    ).first()
                    if not existing:
                        action = ResponseAction(
                            action_id=act_id,
                            incident_id=inc_id,
                            action_type="BLOCK_IP",
                            target_type="IP",
                            target_value=ip,
                            reason=f"Block malicious external IP {ip} identified as attack origin in incident {inc_id}.",
                            expected_effect=f"Perimeter firewall sandbox drops all inbound/outbound packets to {ip}.",
                            status="PENDING_APPROVAL" if target_inc.risk_score >= 70 else "RECOMMENDED",
                            is_dry_run=True,
                            requires_approval=True,
                            created_at=datetime.now(timezone.utc)
                        )
                        self.db.add(action)
                        recommended_actions.append(action)

            # 2. Compromised Account -> Disable Account recommendation
            for user in users:
                act_id = f"ACT-DIS-{uuid.uuid4().hex[:6].upper()}"
                existing = self.db.query(ResponseAction).filter(
                    ResponseAction.incident_id == inc_id,
                    ResponseAction.target_value == user
                ).first()
                if not existing:
                    action = ResponseAction(
                        action_id=act_id,
                        incident_id=inc_id,
                        action_type="DISABLE_USER",
                        target_type="USER",
                        target_value=user,
                        reason=f"Disable potentially compromised identity '{user}' to halt credential abuse.",
                        expected_effect=f"Simulated IAM directory revokes login sessions and disables password auth for '{user}'.",
                        status="PENDING_APPROVAL",
                        is_dry_run=True,
                        requires_approval=True,
                        created_at=datetime.now(timezone.utc)
                    )
                    self.db.add(action)
                    recommended_actions.append(action)

            # 3. Affected Endpoint -> Isolate Endpoint recommendation
            for host in hosts:
                act_id = f"ACT-ISO-{uuid.uuid4().hex[:6].upper()}"
                existing = self.db.query(ResponseAction).filter(
                    ResponseAction.incident_id == inc_id,
                    ResponseAction.target_value == host
                ).first()
                if not existing:
                    action = ResponseAction(
                        action_id=act_id,
                        incident_id=inc_id,
                        action_type="ISOLATE_ENDPOINT",
                        target_type="ENDPOINT",
                        target_value=host,
                        reason=f"Isolate host {host} exhibiting suspicious process activity / malware execution.",
                        expected_effect=f"Simulated EDR network containment isolates {host} allowing only SOC telemetry.",
                        status="PENDING_APPROVAL",
                        is_dry_run=True,
                        requires_approval=True,
                        created_at=datetime.now(timezone.utc)
                    )
                    self.db.add(action)
                    recommended_actions.append(action)

            self.db.commit()

            if recommended_actions:
                target_inc.response_status = "PENDING_APPROVAL"
                self.db.commit()

                self.record_finding(
                    title=f"SOAR Defensive Containment Formulated ({len(recommended_actions)} Actions)",
                    severity="HIGH",
                    confidence=0.95,
                    description=f"Generated policy-governed containment proposals for incident {inc_id}. Awaiting SOC analyst authorization.",
                    evidence={
                        "incident_id": inc_id,
                        "actions": [f"{a.action_type} -> {a.target_value}" for a in recommended_actions]
                    },
                    recommendations=[
                        "Review dry-run action parameters in Response Console",
                        "Approve and execute authorized containment actions"
                    ]
                )

        return {
            "incident_id": target_inc.incident_id if target_inc else None,
            "actions_formulated": len(recommended_actions)
        }
