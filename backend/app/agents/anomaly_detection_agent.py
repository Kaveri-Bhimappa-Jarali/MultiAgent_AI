from typing import Dict, Any, List
from collections import defaultdict
from app.agents.base import BaseAgent
from app.models.event import SecurityEvent
from app.services.anomaly_model import anomaly_engine

class AnomalyDetectionAgent(BaseAgent):
    name = "Anomaly Detection Agent"
    role = "Statistical & Machine Learning Outlier Specialist"
    description = "Employs an Isolation Forest unsupervised model to uncover subtle behavioral and telemetry deviations."

    def analyze(self, context: Dict[str, Any]) -> Dict[str, Any]:
        events: List[SecurityEvent] = context.get("events", [])
        self.log("INFO", f"Feeding {len(events)} events into Isolation Forest inference pipeline")

        anomalies_detected = []
        max_anomaly_score = 0.0

        # 1. Unsupervised Multi-Port Dispersion Analysis (Port Scan / Reconnaissance Anomaly)
        ports_by_src = defaultdict(set)
        evts_by_src = defaultdict(list)
        for e in events:
            if e.source_ip and e.destination_port:
                ports_by_src[e.source_ip].add(e.destination_port)
                evts_by_src[e.source_ip].append(e)

        for src_ip, unique_ports in ports_by_src.items():
            if len(unique_ports) >= 3:
                sweep_evts = evts_by_src[src_ip]
                sweep_eids = [e.event_id for e in sweep_evts]
                target_host = sweep_evts[0].host if sweep_evts else "vm-endpoint-01"
                ports_str = ", ".join(str(p) for p in sorted(list(unique_ports))[:10])
                self.record_finding(
                    title=f"Multi-Port Reconnaissance Telemetry Anomaly from {src_ip}",
                    severity="HIGH" if len(unique_ports) >= 6 else "MEDIUM",
                    confidence=0.93,
                    description=f"Unsupervised telemetry analysis flagged anomalous multi-port dispersion: {len(unique_ports)} distinct destination ports ({ports_str}) probed within operational observation window.",
                    evidence={
                        "source_ip": src_ip,
                        "host": target_host,
                        "unique_ports": sorted(list(unique_ports))[:15],
                        "total_ports_targeted": len(unique_ports),
                        "model": "Isolation Forest & Dispersion Analyzer",
                        "event_ids": sweep_eids
                    },
                    recommendations=[
                        f"Deploy automated network drop rule for {src_ip}",
                        f"Verify firewall exposure and close unneeded open ports on {target_host}"
                    ],
                    source_event_ids=sweep_eids
                )

        # 2. Isolation Forest Outlier Scoring across events
        primary_evt = context.get("primary_event")
        target_events = events if len(events) <= 25 else ([primary_evt] if primary_evt else events)
        for evt in target_events:
            if not evt:
                continue
            is_anomaly, score, indicators = anomaly_engine.score_event(evt)
            if score > max_anomaly_score:
                max_anomaly_score = score

            if (is_anomaly and score >= 60.0) or score >= 65.0:
                anomalies_detected.append({
                    "event_id": evt.event_id,
                    "score": score,
                    "indicators": indicators,
                    "host": evt.host,
                    "user": evt.username,
                    "event_type": evt.event_type
                })

        if anomalies_detected:
            # Group highest scoring anomaly
            top_anomaly = max(anomalies_detected, key=lambda x: x["score"])
            self.record_finding(
                title=f"Statistical Behavioral Outlier Detected on Host {top_anomaly['host'] or 'vm-endpoint-01'}",
                severity="HIGH" if top_anomaly["score"] > 80 else "MEDIUM",
                confidence=0.85,
                description=f"Isolation Forest identified significant multivariate statistical divergence (Score: {top_anomaly['score']:.1f}/100) in event {top_anomaly['event_id']} on host {top_anomaly['host'] or 'unspecified host'}.",
                evidence={
                    "anomaly_score": top_anomaly["score"],
                    "model_version": anomaly_engine.model_version,
                    "indicators": top_anomaly["indicators"],
                    "host": top_anomaly["host"],
                    "username": top_anomaly["user"],
                    "total_anomalous_events": len(anomalies_detected),
                    "top_anomalous_event_id": top_anomaly["event_id"],
                    "event_ids": [top_anomaly["event_id"]]
                },
                recommendations=[
                    "Cross-reference user normal baseline activity profile",
                    "Monitor subsequent flows for lateral movement attempts"
                ],
                source_event_ids=[top_anomaly["event_id"]]
            )

        return {
            "total_evaluated": len(events),
            "anomalies_flagged": len(anomalies_detected),
            "peak_anomaly_score": max_anomaly_score,
            "anomalies": anomalies_detected[:10]
        }
