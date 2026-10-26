from typing import Dict, Any, List
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

        for evt in events:
            is_anomaly, score, indicators = anomaly_engine.score_event(evt)
            if score > max_anomaly_score:
                max_anomaly_score = score
                
            if is_anomaly or score >= 65.0:
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
                title=f"Statistical Behavioral Outlier Detected (Score: {top_anomaly['score']}/100)",
                severity="HIGH" if top_anomaly["score"] > 80 else "MEDIUM",
                confidence=round(min(0.95, top_anomaly["score"] / 100), 2),
                description=f"Isolation Forest identified significant multivariate statistical divergence in event {top_anomaly['event_id']} on host {top_anomaly['host']}.",
                evidence={
                    "anomaly_score": top_anomaly["score"],
                    "model_version": anomaly_engine.model_version,
                    "indicators": top_anomaly["indicators"],
                    "total_anomalous_events": len(anomalies_detected),
                    "top_anomalous_event_id": top_anomaly["event_id"]
                },
                recommendations=[
                    "Cross-reference user normal baseline activity profile",
                    "Monitor subsequent flows for lateral movement attempts"
                ]
            )

        return {
            "total_evaluated": len(events),
            "anomalies_flagged": len(anomalies_detected),
            "peak_anomaly_score": max_anomaly_score,
            "anomalies": anomalies_detected[:10]
        }
