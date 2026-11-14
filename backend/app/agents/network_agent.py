from typing import Dict, Any, List
from app.agents.base import BaseAgent
from app.models.event import SecurityEvent
from app.services.threat_intel_service import lookup_indicator
from app.services.dataset_pipeline import extract_flow_features_from_event, run_realtime_flow_inference

class NetworkMonitoringAgent(BaseAgent):
    name = "Network Monitoring Agent"
    role = "Network Traffic & Perimeter Specialist"
    description = "Analyses network connections, traffic velocity, scanning sweeps, and unauthorized perimeter access."

    def analyze(self, context: Dict[str, Any]) -> Dict[str, Any]:
        events: List[SecurityEvent] = context.get("events", [])
        network_events = [e for e in events if e.event_type in ["network_connection", "network_traffic", "network"]]
        self.log("INFO", f"Ingested {len(network_events)} network telemetry events for flow analysis")

        findings_summary = []
        scanned_ips = {}
        c2_connections = []
        ml_detections = []

        for e in network_events:
            src = e.source_ip or "unknown"
            dst_port = e.destination_port
            scanned_ips.setdefault(src, set())
            if dst_port:
                scanned_ips[src].add(dst_port)

            # Dynamic CTI verification without hardcoded IPs
            dest_ip = e.destination_ip
            is_c2 = False
            if dest_ip:
                ti_match = lookup_indicator(self.db, dest_ip)
                if ti_match and ti_match.found and ti_match.risk_level in ["MALICIOUS", "SUSPICIOUS"]:
                    is_c2 = True
                    c2_connections.append((e, ti_match.threat_details.threat_name if ti_match.threat_details else "Command & Control Node"))
                elif e.severity in ["HIGH", "CRITICAL"] and any(p in (e.raw_payload or "").lower() for p in ["c2", "beacon", "reverse_shell"]):
                    c2_connections.append((e, "Suspected Command & Control Channel"))

            # Supervised ML Flow Inference on flow attributes
            flow_feats = extract_flow_features_from_event(e)
            if flow_feats and len(flow_feats) > 0:
                ml_res = run_realtime_flow_inference(flow_feats)
                if ml_res.get("ml_evaluated") and ml_res.get("is_malicious") and ml_res.get("attack_probability", 0) >= 0.60:
                    ml_detections.append((e, ml_res))

        # Check port diversity per source IP
        for src, ports in scanned_ips.items():
            if len(ports) >= 3:
                sweep_evts = [e for e in network_events if (e.source_ip or "unknown") == src and e.destination_port in ports]
                sweep_event_ids = [e.event_id for e in sweep_evts]
                self.record_finding(
                    title=f"Horizontal/Vertical Port Sweep from {src}",
                    severity="HIGH" if len(ports) > 8 else "MEDIUM",
                    confidence=0.91,
                    description=f"Source host {src} generated connection attempts targeting {len(ports)} unique service ports in a narrow observation window.",
                    evidence={
                        "source_ip": src,
                        "unique_ports": sorted(list(ports))[:15],
                        "total_ports_targeted": len(ports),
                        "event_ids": sweep_event_ids
                    },
                    recommendations=[
                        f"Deploy automated egress/ingress drop rule for {src}",
                        "Inspect target host service configurations for unauthorized service exposure"
                    ],
                    source_event_ids=sweep_event_ids
                )
                findings_summary.append(f"Port sweep detected from {src}")

        if c2_connections:
            for c2_evt, c2_desc in c2_connections:
                self.record_finding(
                    title=f"Command & Control Beaconing to {c2_evt.destination_ip}",
                    severity="CRITICAL",
                    confidence=0.97,
                    description=f"Host {c2_evt.host or c2_evt.source_ip} initiated network traffic to known threat infrastructure at {c2_evt.destination_ip}:{c2_evt.destination_port} ({c2_desc}).",
                    evidence={
                        "source_ip": c2_evt.source_ip,
                        "destination_ip": c2_evt.destination_ip,
                        "destination_port": c2_evt.destination_port,
                        "host": c2_evt.host,
                        "protocol": c2_evt.protocol,
                        "threat_classification": c2_desc,
                        "event_ids": [c2_evt.event_id]
                    },
                    recommendations=[
                        f"Block remote destination {c2_evt.destination_ip} on perimeter gateway",
                        f"Isolate local endpoint {c2_evt.host} to prevent lateral C2 expansion"
                    ],
                    source_event_ids=[c2_evt.event_id]
                )
                findings_summary.append(f"C2 Beaconing identified to {c2_evt.destination_ip}")

        # Record supervised ML flow detections
        for ml_evt, ml_res in ml_detections:
            self.record_finding(
                title=f"Supervised ML Network Intrusion Flow from {ml_evt.source_ip}",
                severity=ml_res.get("assigned_severity", "HIGH"),
                confidence=ml_res.get("confidence", 0.92),
                description=ml_res.get("explanation"),
                evidence={
                    "event_ids": [ml_evt.event_id],
                    "source_ip": ml_evt.source_ip,
                    "destination_ip": ml_evt.destination_ip,
                    "destination_port": ml_evt.destination_port,
                    "model_version": ml_res.get("model_version"),
                    "attack_probability": ml_res.get("attack_probability"),
                    "dataset_provenance": ml_res.get("dataset_name")
                },
                recommendations=[
                    f"Deploy network firewall rule to block {ml_evt.source_ip}",
                    "Initiate packet capture on target network interface for forensic analysis"
                ],
                source_event_ids=[ml_evt.event_id]
            )
            findings_summary.append(f"ML Intrusion Flow identified from {ml_evt.source_ip}")

        return {
            "analyzed_network_events": len(network_events),
            "findings_summary": findings_summary,
            "unique_source_ips": list(scanned_ips.keys()),
            "ml_intrusions_flagged": len(ml_detections)
        }
