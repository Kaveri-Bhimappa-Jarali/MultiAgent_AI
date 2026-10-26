from typing import Dict, Any, List
from app.agents.base import BaseAgent
from app.models.event import SecurityEvent

class EndpointAgent(BaseAgent):
    name = "Endpoint Agent"
    role = "Host & EDR Telemetry Specialist"
    description = "Examines host-level process trees, privilege changes, file staging, and malicious execution anomalies."

    def analyze(self, context: Dict[str, Any]) -> Dict[str, Any]:
        events: List[SecurityEvent] = context.get("events", [])
        endpoint_events = [e for e in events if e.event_type in ["process_execution", "file_access", "privilege_escalation"]]
        self.log("INFO", f"Analyzing {len(endpoint_events)} host-level operational events across managed endpoints")

        findings_count = 0
        for e in endpoint_events:
            # 1. Process execution check
            if e.event_type == "process_execution":
                proc = (e.process_name or "").lower()
                cmd = (e.command_line or "").lower()
                
                if "vssadmin" in proc or "delete shadows" in cmd:
                    self.record_finding(
                        title=f"Inhibition of System Recovery (Shadow Copy Deletion) on {e.host}",
                        severity="CRITICAL",
                        confidence=0.98,
                        description=f"Host {e.host} executed destructive command '{e.command_line}' targeting volume shadow backup copies.",
                        evidence={
                            "host": e.host,
                            "process_name": e.process_name,
                            "command_line": e.command_line,
                            "mitre_technique": "T1490"
                        },
                        recommendations=[
                            f"Immediately isolate host {e.host} from network",
                            "Initiate automated ransomware containment protocol"
                        ]
                    )
                    findings_count += 1
                elif "powershell" in proc and ("-enc" in cmd or "downloadstring" in cmd):
                    self.record_finding(
                        title=f"Obfuscated PowerShell Execution on {e.host}",
                        severity="HIGH",
                        confidence=0.92,
                        description=f"Suspicious encoded PowerShell script invocation on host {e.host}: {e.command_line}",
                        evidence={
                            "host": e.host,
                            "process_name": e.process_name,
                            "command_line": e.command_line,
                            "user": e.username
                        },
                        recommendations=[
                            f"Collect script block logs and dump process memory on {e.host}",
                            "Kill offending process PID and isolate endpoint"
                        ]
                    )
                    findings_count += 1

            # 2. Privilege escalation check
            elif e.event_type == "privilege_escalation":
                self.record_finding(
                    title=f"Privilege Escalation on Host {e.host}",
                    severity="CRITICAL",
                    confidence=0.95,
                    description=f"Account '{e.username}' performed unauthorized privilege escalation on {e.host} via '{e.command_line}'.",
                    evidence={
                        "host": e.host,
                        "user": e.username,
                        "command": e.command_line
                    },
                    recommendations=[
                        f"Terminate active shell sessions for '{e.username}'",
                        f"Isolate host {e.host} to prevent credential dumping"
                    ]
                )
                findings_count += 1

            # 3. File staging check
            elif e.event_type == "file_access":
                fpath = (e.file_path or "").lower()
                if any(p in fpath for p in ["sam", "shadow", "backup.sql", "passwords", "secret"]):
                    self.record_finding(
                        title=f"Sensitive Data Access on {e.host}",
                        severity="HIGH",
                        confidence=0.88,
                        description=f"Account '{e.username}' accessed sensitive protected resource '{e.file_path}' on host {e.host}.",
                        evidence={
                            "host": e.host,
                            "user": e.username,
                            "file_path": e.file_path,
                            "action": e.file_action
                        },
                        recommendations=[
                            "Review file access authorization matrix",
                            "Verify whether data staging or exfiltration occurred"
                        ]
                    )
                    findings_count += 1

        return {
            "endpoint_events_evaluated": len(endpoint_events),
            "findings_count": findings_count
        }
