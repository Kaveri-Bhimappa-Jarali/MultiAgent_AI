from typing import Dict, Any, List, Set
import re
from app.agents.base import BaseAgent
from app.models.event import SecurityEvent
from app.services.threat_intel_service import lookup_indicator

SHA256_RE = re.compile(r'\b[a-fA-F0-9]{64}\b')
DOMAIN_RE = re.compile(r'\b([a-zA-Z0-9][-a-zA-Z0-9]*\.(?:com|org|net|xyz|io|info|ru|cn))\b', re.IGNORECASE)

class ThreatIntelligenceAgent(BaseAgent):
    name = "Threat Intelligence Agent"
    role = "Cyber Threat Intelligence (CTI) Specialist"
    description = "Enriches IP addresses, domains, and hashes against curated enterprise threat intelligence repositories."

    def analyze(self, context: Dict[str, Any]) -> Dict[str, Any]:
        events: List[SecurityEvent] = context.get("events", [])
        self.log("INFO", f"Harvesting observables from {len(events)} telemetry events for CTI correlation")

        # Collect unique IPs, domains, hashes
        ips: Set[str] = {e.source_ip for e in events if e.source_ip} | {e.destination_ip for e in events if e.destination_ip}
        ips.discard(None)
        ips.discard("127.0.0.1")
        ips.discard("localhost")

        domains: Set[str] = set()
        hashes: Set[str] = set()

        for e in events:
            text_blobs = [e.command_line or "", e.raw_payload or "", e.file_path or ""]
            for blob in text_blobs:
                if not blob:
                    continue
                # Extract SHA256 hashes
                found_hashes = SHA256_RE.findall(blob)
                for h in found_hashes:
                    hashes.add(h.lower())
                # Extract domain candidates
                found_domains = DOMAIN_RE.findall(blob)
                for d in found_domains:
                    domains.add(d.lower())

        observables = list(ips) + list(domains) + list(hashes)
        enriched_matches = []

        for obs in observables:
            lookup = lookup_indicator(self.db, obs)
            if lookup.found and lookup.risk_level in ["MALICIOUS", "SUSPICIOUS"]:
                details = lookup.threat_details
                matching_evts = [
                    e for e in events
                    if e.source_ip == obs or e.destination_ip == obs
                    or obs in (e.command_line or "") or obs in (e.raw_payload or "") or obs in (e.file_path or "")
                ]
                matching_event_ids = [e.event_id for e in matching_evts]
                self.record_finding(
                    title=f"CTI Threat Match: {details.threat_name} ({obs})",
                    severity=details.severity,
                    confidence=details.confidence,
                    description=f"Observable {obs} matched curated threat intelligence indicator linked to actor '{details.threat_actor}'.",
                    evidence={
                        "indicator": obs,
                        "indicator_type": details.indicator_type,
                        "source_ip": obs if obs in ips else None,
                        "threat_actor": details.threat_actor,
                        "threat_name": details.threat_name,
                        "tags": details.tags,
                        "reputation_score": lookup.reputation_score,
                        "source": lookup.source,
                        "event_ids": matching_event_ids
                    },
                    recommendations=lookup.recommendations,
                    source_event_ids=matching_event_ids
                )
                enriched_matches.append({
                    "indicator": obs,
                    "type": details.indicator_type,
                    "threat": details.threat_name,
                    "actor": details.threat_actor,
                    "severity": details.severity
                })

        return {
            "total_indicators_queried": len(observables),
            "threat_matches_found": len(enriched_matches),
            "matches": enriched_matches
        }

