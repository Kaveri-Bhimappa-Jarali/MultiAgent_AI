from typing import Dict, Any, List
from app.agents.base import BaseAgent
from app.models.event import SecurityEvent

class AuthenticationAgent(BaseAgent):
    name = "Authentication Agent"
    role = "Identity & Access Threat Specialist"
    description = "Analyses login activities, brute-force attempts, credential stuffing, and compromised identity sequences."

    def analyze(self, context: Dict[str, Any]) -> Dict[str, Any]:
        events: List[SecurityEvent] = context.get("events", [])
        auth_events = [e for e in events if e.event_type == "authentication"]
        self.log("INFO", f"Inspecting {len(auth_events)} authentication records for identity abuse patterns")

        user_attempts = {}
        ip_attempts = {}

        for e in auth_events:
            u = e.username or "unknown_user"
            ip = e.source_ip or "unknown_ip"
            user_attempts.setdefault(u, []).append(e)
            ip_attempts.setdefault(ip, []).append(e)

        findings_count = 0
        # 1. Check brute force bursts per IP
        for ip, ip_evts in ip_attempts.items():
            failed = [
                e for e in ip_evts 
                if e.severity in ["MEDIUM", "HIGH", "CRITICAL"] or "fail" in (e.file_action or "").lower() or "fail" in (e.command_line or "").lower()
            ]
            if len(failed) >= 3:
                targeted_users = list({e.username for e in failed if e.username})
                failed_event_ids = [e.event_id for e in failed]
                self.record_finding(
                    title=f"Authentication Brute-Force Spray from IP {ip}",
                    severity="HIGH",
                    confidence=0.94,
                    description=f"Source {ip} generated {len(failed)} failed authentication attempts targeting accounts {targeted_users}.",
                    evidence={
                        "source_ip": ip,
                        "failure_count": len(failed),
                        "targeted_accounts": targeted_users,
                        "event_ids": failed_event_ids
                    },
                    recommendations=[
                        f"Enforce adaptive MFA and temporarily throttle IP {ip}",
                        "Notify security operations of ongoing credential stuffing campaign"
                    ],
                    source_event_ids=failed_event_ids
                )
                findings_count += 1
            elif 0 < len(failed) < 3:
                for e in failed:
                    self.record_finding(
                        title=f"Failed Authentication Attempt ({e.username or ip})",
                        severity="LOW" if e.severity == "LOW" else "MEDIUM",
                        confidence=0.85,
                        description=f"Failed authentication attempt recorded for user '{e.username}' from IP '{ip}'.",
                        evidence={
                            "source_ip": ip,
                            "username": e.username,
                            "host": e.host,
                            "event_ids": [e.event_id]
                        },
                        recommendations=["Monitor account for additional consecutive failed attempts."],
                        source_event_ids=[e.event_id]
                    )
                    findings_count += 1

        # 2. Check compromised account: failures followed by success
        for user, user_evts in user_attempts.items():
            has_burst_success = any(
                e for e in user_evts if e.file_action == "SUCCESS_POST_BURST" or (e.severity == "INFO" and "success after" in (e.raw_payload or "").lower())
            )
            if has_burst_success:
                user_evt_ids = [e.event_id for e in user_evts]
                self.record_finding(
                    title=f"Probable Account Takeover for User '{user}'",
                    severity="CRITICAL",
                    confidence=0.96,
                    description=f"User account '{user}' authenticated successfully following a rapid burst of failed login attempts.",
                    evidence={
                        "compromised_user": user,
                        "username": user,
                        "associated_events": user_evt_ids,
                        "event_ids": user_evt_ids
                    },
                    recommendations=[
                        f"Immediately disable user account '{user}' in identity provider sandbox",
                        f"Revoke all active OAuth sessions and refresh tokens for '{user}'",
                        "Initiate forensic audit of recent actions performed under this identity"
                    ],
                    source_event_ids=user_evt_ids
                )
                findings_count += 1

        return {
            "total_auth_events": len(auth_events),
            "accounts_analyzed": len(user_attempts),
            "threats_uncovered": findings_count
        }
