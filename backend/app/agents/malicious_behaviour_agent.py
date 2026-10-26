from typing import Dict, Any, List
from app.agents.base import BaseAgent
from app.models.event import SecurityEvent

class MaliciousBehaviourAgent(BaseAgent):
    name = "Malicious Behaviour Agent"
    role = "Composite Threat Behavior Specialist"
    description = "Examines cross-domain telemetry combinations indicating coordinated multi-stage cyberattacks."

    def analyze(self, context: Dict[str, Any]) -> Dict[str, Any]:
        events: List[SecurityEvent] = context.get("events", [])
        self.log("INFO", f"Correlating behavioral signatures across {len(events)} events")

        event_types = {e.event_type for e in events}
        hosts = {e.host for e in events if e.host}
        users = {e.username for e in events if e.username}
        
        composite_findings = []

        # Check multi-stage sequence: Auth + Privilege + File access
        has_auth = "authentication" in event_types
        has_priv = "privilege_escalation" in event_types or any("sudo" in (e.command_line or "").lower() for e in events)
        has_file = "file_access" in event_types
        has_proc = "process_execution" in event_types
        has_net = "network_connection" in event_types

        if has_auth and has_priv and has_file:
            self.record_finding(
                title="Multi-Stage Attack Chain: Compromise → Escalation → Data Staging",
                severity="CRITICAL",
                confidence=0.96,
                description=f"Detected coordinated intrusion lifecycle across hosts {list(hosts)} and identities {list(users)}. Attacker progressed from access to privilege escalation and unauthorized file access.",
                evidence={
                    "stages_detected": ["Authentication", "Privilege Escalation", "File Access"],
                    "associated_hosts": list(hosts),
                    "associated_users": list(users),
                    "total_chain_events": len(events)
                },
                recommendations=[
                    "Trigger automated Incident Escalation protocol",
                    "Execute host isolation on all involved endpoints simultaneously",
                    "Initiate emergency credential revocation for involved user identities"
                ]
            )
            composite_findings.append("Full Intrusion Kill-Chain identified")

        elif has_net and has_proc:
            self.record_finding(
                title="Suspicious Network Ingress Followed by Process Execution",
                severity="HIGH",
                confidence=0.90,
                description="Network activity correlated immediately with script/binary execution on target host, suggesting remote command delivery or dropper invocation.",
                evidence={
                    "event_types": list(event_types),
                    "target_hosts": list(hosts)
                },
                recommendations=[
                    "Inspect firewall inbound flow logs",
                    "Audit EDR parent-child process relationship"
                ]
            )
            composite_findings.append("Network-to-Execution pivot observed")

        return {
            "distinct_event_types": list(event_types),
            "composite_patterns_detected": len(composite_findings),
            "summary": composite_findings
        }
