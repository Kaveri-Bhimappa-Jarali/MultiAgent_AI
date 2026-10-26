from typing import Dict, Any, List
from app.agents.base import BaseAgent
from app.models.event import SecurityEvent
from app.services.threat_intel_service import lookup_indicator

class ThreatIntelligenceAgent(BaseAgent):
    name = "Threat Intelligence Agent"
    role = "Cyber Threat Intelligence (CTI) Specialist"
    description = "Enriches IP addresses, domains, and hashes against curated enterprise threat intelligence repositories."

    def analyze(self, context: Dict[str, Any]) -> Dict[str, Any]:
        events: List[SecurityEvent] = context.get("events", [])
        self.log("INFO", f"Harvesting observables from {len(events)} telemetry events for CTI correlation")

        # Collect unique IPs, domains, hashes
        ips = {e.source_ip for e in events if e.source_ip} | {e.destination_ip for e in events if e.destination_ip}
        ips.discard(None)
        ips.discard("127.0.0.1")
        ips.discard("localhost")

        enriched_matches = []
        for ip in ips:
            lookup = lookup_indicator(self.db, ip)
            if lookup.found and lookup.risk_level in ["MALICIOUS", "SUSPICIOUS"]:
                details = lookup.threat_details
                self.record_finding(
                    title=f"CTI Threat Match: {details.threat_name} ({ip})",
                    severity=details.severity,
                    confidence=details.confidence,
                    description=f"Observable {ip} matched curated threat intelligence indicator linked to actor '{details.threat_actor}'.",
                    evidence={
                        "indicator": ip,
                        "threat_actor": details.threat_actor,
                        "threat_name": details.threat_name,
                        "tags": details.tags,
                        "reputation_score": lookup.reputation_score,
                        "source": lookup.source
                    },
                    recommendations=lookup.recommendations
                )
                enriched_matches.append({
                    "indicator": ip,
                    "threat": details.threat_name,
                    "actor": details.threat_actor,
                    "severity": details.severity
                })

        return {
            "total_indicators_queried": len(ips),
            "threat_matches_found": len(enriched_matches),
            "matches": enriched_matches
        }
