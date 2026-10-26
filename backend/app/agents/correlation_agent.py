import uuid
from typing import Dict, Any, List
from datetime import datetime, timezone
from app.agents.base import BaseAgent
from app.models.event import SecurityEvent
from app.models.incident import Incident, IncidentEvent, IncidentAudit

class CorrelationAgent(BaseAgent):
    name = "Correlation Agent"
    role = "Incident Synthesis & Alert Aggregator"
    description = "Clusters fragmented detection findings and telemetry into unified, actionable security incidents."

    def analyze(self, context: Dict[str, Any]) -> Dict[str, Any]:
        events: List[SecurityEvent] = context.get("events", [])
        if not events:
            self.log("INFO", "No events provided for correlation")
            return {"incidents_created": 0}

        self.log("INFO", f"Correlating {len(events)} security telemetry events across entities and temporal proximity")

        # Cluster events by primary pivot: username, host, or source IP
        clusters = {}
        for evt in events:
            key = evt.username or evt.host or evt.source_ip or "unassigned_cluster"
            clusters.setdefault(key, []).append(evt)

        created_incidents = []

        for pivot_key, cluster_events in clusters.items():
            # Check if this cluster has suspicious or notable activity
            has_threat = any(e.severity in ["MEDIUM", "HIGH", "CRITICAL"] for e in cluster_events)
            if not has_threat and len(cluster_events) < 3:
                continue

            # Determine title & severity
            event_types = {e.event_type for e in cluster_events}
            has_auth = "authentication" in event_types
            has_priv = "privilege_escalation" in event_types
            has_file = "file_access" in event_types
            has_net = "network_connection" in event_types
            has_proc = "process_execution" in event_types

            max_sev = "MEDIUM"
            if any(e.severity == "CRITICAL" for e in cluster_events) or (has_auth and has_priv):
                max_sev = "CRITICAL"
            elif any(e.severity == "HIGH" for e in cluster_events):
                max_sev = "HIGH"

            if has_auth and has_priv:
                title = f"Multi-Stage Account Compromise & Privilege Escalation ({pivot_key})"
            elif has_net and len(cluster_events) >= 5:
                title = f"High-Volume Network Reconnaissance & Scanning ({pivot_key})"
            elif has_proc:
                title = f"Suspicious Process Execution & Endpoint Anomaly ({pivot_key})"
            else:
                title = f"Suspicious Activity Cluster ({pivot_key})"

            inc_id = f"INC-{datetime.now(timezone.utc).strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
            timestamps = [e.timestamp for e in cluster_events if e.timestamp]
            first_seen = min(timestamps) if timestamps else datetime.now(timezone.utc)
            last_seen = max(timestamps) if timestamps else datetime.now(timezone.utc)

            users = list({e.username for e in cluster_events if e.username})
            hosts = list({e.host for e in cluster_events if e.host})
            ips = list({e.source_ip for e in cluster_events if e.source_ip} | {e.destination_ip for e in cluster_events if e.destination_ip})
            is_sim = any(e.is_simulated for e in cluster_events)

            # Check if matching open incident exists for this pivot key
            existing_inc = None
            for inc in self.db.query(Incident).filter(Incident.status.in_(["NEW", "INVESTIGATING"])).all():
                if pivot_key in (inc.affected_users + inc.affected_hosts + inc.affected_ips):
                    existing_inc = inc
                    break

            if existing_inc:
                # Update existing incident
                existing_inc.last_seen = last_seen
                existing_inc.event_count = len(cluster_events)
                if max_sev == "CRITICAL":
                    existing_inc.severity = "CRITICAL"
                # Add new events to incident_events
                for idx, e in enumerate(cluster_events):
                    rel = self.db.query(IncidentEvent).filter(
                        IncidentEvent.incident_id == existing_inc.incident_id,
                        IncidentEvent.event_id == e.event_id
                    ).first()
                    if not rel:
                        self.db.add(IncidentEvent(
                            incident_id=existing_inc.incident_id,
                            event_id=e.event_id,
                            sequence_order=idx,
                            added_at=datetime.now(timezone.utc)
                        ))
                self.db.commit()
                inc_id = existing_inc.incident_id
                target_inc = existing_inc
            else:
                # Create new incident
                new_inc = Incident(
                    incident_id=inc_id,
                    title=title,
                    description=f"Correlated {len(cluster_events)} security events linked to entity '{pivot_key}' with peak severity {max_sev}.",
                    severity=max_sev,
                    risk_score=75 if max_sev == "CRITICAL" else (60 if max_sev == "HIGH" else 45),
                    confidence=0.91,
                    status="NEW",
                    first_seen=first_seen,
                    last_seen=last_seen,
                    affected_users=users,
                    affected_hosts=hosts,
                    affected_ips=ips,
                    event_count=len(cluster_events),
                    assigned_analyst="Unassigned",
                    investigation_status="PENDING",
                    response_status="RECOMMENDED" if max_sev in ["HIGH", "CRITICAL"] else "NONE",
                    is_simulated=is_sim,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc)
                )
                self.db.add(new_inc)
                self.db.commit()

                # Add events
                for idx, e in enumerate(cluster_events):
                    self.db.add(IncidentEvent(
                        incident_id=inc_id,
                        event_id=e.event_id,
                        sequence_order=idx,
                        added_at=datetime.now(timezone.utc)
                    ))

                # Add audit log
                self.db.add(IncidentAudit(
                    incident_id=inc_id,
                    actor="Correlation Agent",
                    action="INCIDENT_CREATED",
                    previous_state=None,
                    new_state="NEW",
                    timestamp=datetime.now(timezone.utc)
                ))
                self.db.commit()
                target_inc = new_inc

            self.record_finding(
                title=f"Incident Aggregated: {inc_id} ({title})",
                severity=max_sev,
                confidence=0.92,
                description=f"Unified {len(cluster_events)} individual telemetry signals into incident {inc_id}.",
                evidence={
                    "incident_id": inc_id,
                    "pivot_entity": pivot_key,
                    "event_count": len(cluster_events),
                    "event_ids": [e.event_id for e in cluster_events]
                },
                recommendations=[
                    f"Assign incident {inc_id} to tier-2 SOC investigator",
                    "Execute attack-path mapping and multi-agent RCA"
                ]
            )
            created_incidents.append(inc_id)

        return {
            "total_clusters": len(clusters),
            "incidents_created_or_updated": len(created_incidents),
            "incident_ids": created_incidents
        }
