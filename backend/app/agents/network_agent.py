from typing import Dict, Any, List
from app.agents.base import BaseAgent
from app.models.event import SecurityEvent

class NetworkMonitoringAgent(BaseAgent):
    name = "Network Monitoring Agent"
    role = "Network Traffic & Perimeter Specialist"
    description = "Analyses network connections, traffic velocity, scanning sweeps, and unauthorized perimeter access."

    def analyze(self, context: Dict[str, Any]) -> Dict[str, Any]:
        events: List[SecurityEvent] = context.get("events", [])
        network_events = [e for e in events if e.event_type == "network_connection"]
        self.log("INFO", f"Ingested {len(network_events)} network telemetry events for flow analysis")

        findings_summary = []
        scanned_ips = {}
        c2_connections = []

        for e in network_events:
            src = e.source_ip or "unknown"
            dst_port = e.destination_port
            scanned_ips.setdefault(src, set())
            if dst_port:
                scanned_ips[src].add(dst_port)
            
            # Check for suspicious external C2 IP or high severity network events
            if e.severity in ["HIGH", "CRITICAL"] or (e.destination_ip and e.destination_ip in ["198.51.100.23", "203.0.113.88"]):
                c2_connections.append(e)

        # Check port diversity per source IP
        for src, ports in scanned_ips.items():
            if len(ports) >= 3:
                self.record_finding(
                    title=f"Horizontal/Vertical Port Sweep from {src}",
                    severity="HIGH" if len(ports) > 8 else "MEDIUM",
                    confidence=0.91,
                    description=f"Source host {src} generated connection attempts targeting {len(ports)} unique service ports in a narrow observation window.",
                    evidence={
                        "source_ip": src,
                        "unique_ports": sorted(list(ports))[:15],
                        "total_ports_targeted": len(ports)
                    },
                    recommendations=[
                        f"Deploy automated egress/ingress drop rule for {src}",
                        "Inspect target host service configurations for unauthorized service exposure"
                    ]
                )
                findings_summary.append(f"Port sweep detected from {src}")

        if c2_connections:
            for c2_evt in c2_connections:
                self.record_finding(
                    title=f"Command & Control Beaconing to {c2_evt.destination_ip}",
                    severity="CRITICAL",
                    confidence=0.97,
                    description=f"Host {c2_evt.host or c2_evt.source_ip} initiated network traffic to known threat infrastructure at {c2_evt.destination_ip}:{c2_evt.destination_port}.",
                    evidence={
                        "source": c2_evt.source_ip,
                        "destination_ip": c2_evt.destination_ip,
                        "destination_port": c2_evt.destination_port,
                        "host": c2_evt.host,
                        "protocol": c2_evt.protocol
                    },
                    recommendations=[
                        f"Block remote destination {c2_evt.destination_ip} on perimeter gateway",
                        f"Isolate local endpoint {c2_evt.host} to prevent lateral C2 expansion"
                    ]
                )
                findings_summary.append(f"C2 Beaconing identified to {c2_evt.destination_ip}")

        return {
            "analyzed_network_events": len(network_events),
            "findings_summary": findings_summary,
            "unique_source_ips": list(scanned_ips.keys())
        }
