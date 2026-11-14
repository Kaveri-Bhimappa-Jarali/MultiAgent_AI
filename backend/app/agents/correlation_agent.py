import uuid
from typing import Dict, Any, List, Set, Optional
from datetime import datetime, timezone, timedelta
from app.agents.base import BaseAgent
from app.models.agent import AgentFinding
from app.models.event import SecurityEvent
from app.models.incident import Incident, IncidentEvent, IncidentFinding, IncidentAudit
from app.services.time_utils import ensure_utc

CORRELATION_WINDOW_SECONDS = 900  # 15 minutes canonical correlation window
SPECIALIZED_DETECTION_AGENTS = [
    "Network Monitoring Agent",
    "Authentication Agent",
    "Endpoint Agent",
    "Malicious Behaviour Agent",
    "Anomaly Detection Agent",
    "Threat Intelligence Agent"
]


class CorrelationAgent(BaseAgent):
    name = "Correlation Agent"
    role = "Incident Synthesis & Alert Aggregator"
    description = "Correlates persisted findings across specialized agents within a 15-minute window, enforcing strict multi-finding eligibility."

    def analyze(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Correlates persisted findings from specialized detection agents.
        Enforces strict architectural rules:
        1. A single event or single finding NEVER creates or updates a multi-agent correlated incident.
        2. Requires at least TWO distinct, persisted findings with meaningful entity relationships.
        3. Enforces the configured 900-second (15-minute) correlation window.
        4. Time proximity is necessary but not sufficient: findings must share entities (IP, user, host).
        5. Preserves existing incident IDs when new related evidence arrives.
        6. Fully idempotent: duplicate findings do not create duplicate incidents or links.
        7. Explicitly records correlation reasons and participating agent attribution.
        """
        now = datetime.now(timezone.utc)
        window_seconds = int(context.get("window_seconds", CORRELATION_WINDOW_SECONDS))
        window_start = now - timedelta(seconds=window_seconds)

        # 1. Retrieve candidate findings in the correlation window
        passed_findings = context.get("findings", [])
        if passed_findings and all(isinstance(f, AgentFinding) for f in passed_findings):
            finding_ids = [f.finding_id for f in passed_findings]
            active_findings = self.db.query(AgentFinding).filter(
                AgentFinding.finding_id.in_(finding_ids),
                AgentFinding.agent_name.in_(SPECIALIZED_DETECTION_AGENTS)
            ).all()
        else:
            all_af = self.db.query(AgentFinding).filter(
                AgentFinding.agent_name.in_(SPECIALIZED_DETECTION_AGENTS)
            ).all()
            active_findings = [f for f in all_af if ensure_utc(f.created_at) >= window_start]

        if not active_findings:
            self.log("INFO", "No specialized agent findings available in correlation window for evaluation.")
            return {
                "total_findings_evaluated": 0,
                "incidents_created": [],
                "incidents_updated": [],
                "incident_ids": [],
                "uncorrelated_findings": []
            }

        self.log("INFO", f"Evaluating correlation across {len(active_findings)} active agent findings (Window: {window_seconds}s)")

        # 2. Extract entities for each finding
        finding_entities: Dict[str, Dict[str, Set[str]]] = {}
        finding_events: Dict[str, List[SecurityEvent]] = {}
        finding_map: Dict[str, AgentFinding] = {f.finding_id: f for f in active_findings}

        for f in active_findings:
            ips: Set[str] = set()
            users: Set[str] = set()
            hosts: Set[str] = set()

            ev = f.evidence if isinstance(f.evidence, dict) else {}
            # From evidence dict
            for key in ["source_ip", "destination_ip", "source", "indicator"]:
                val = ev.get(key)
                if val and isinstance(val, str) and not any(val.startswith(p) for p in ["127.", "localhost"]):
                    ips.add(val.strip())

            for key in ["username", "user", "compromised_user"]:
                val = ev.get(key)
                if val and isinstance(val, str) and val.lower() not in ["none", "unknown", "system"]:
                    users.add(val.strip())

            if isinstance(ev.get("targeted_accounts"), list):
                for u in ev["targeted_accounts"]:
                    if u and isinstance(u, str):
                        users.add(u.strip())

            for key in ["host", "hostname"]:
                val = ev.get(key)
                if val and isinstance(val, str) and val.lower() not in ["none", "unknown", "network"]:
                    hosts.add(val.strip())

            for key in ["associated_hosts", "target_hosts"]:
                if isinstance(ev.get(key), list):
                    for h in ev[key]:
                        if h and isinstance(h, str):
                            hosts.add(h.strip())

            # Associated events
            evt_ids = list(f.source_event_ids or [])
            if not evt_ids and "event_ids" in ev and isinstance(ev["event_ids"], list):
                evt_ids = [str(x) for x in ev["event_ids"]]

            events: List[SecurityEvent] = []
            if evt_ids:
                events = self.db.query(SecurityEvent).filter(SecurityEvent.event_id.in_(evt_ids)).all()
                for e in events:
                    if e.source_ip and not e.source_ip.startswith("127."):
                        ips.add(e.source_ip.strip())
                    if e.destination_ip and not e.destination_ip.startswith("127."):
                        ips.add(e.destination_ip.strip())
                    if e.username and e.username.lower() not in ["none", "unknown"]:
                        users.add(e.username.strip())
                    if e.host and e.host.lower() not in ["none", "unknown"]:
                        hosts.add(e.host.strip())

            finding_entities[f.finding_id] = {
                "ips": ips,
                "users": users,
                "hosts": hosts
            }
            finding_events[f.finding_id] = events

        # 3. Graph clustering based on shared entities
        clusters: List[Set[str]] = []

        def shares_entity(f1_id: str, f2_id: str) -> bool:
            ent1 = finding_entities[f1_id]
            ent2 = finding_entities[f2_id]
            common_ips = ent1["ips"] & ent2["ips"]
            common_users = ent1["users"] & ent2["users"]
            common_hosts = ent1["hosts"] & ent2["hosts"]
            return bool(common_ips or common_users or common_hosts)

        # Retrieve open incidents active in window
        all_open_incidents = self.db.query(Incident).filter(
            Incident.status.in_(["NEW", "INVESTIGATING", "CONTAINED"])
        ).all()
        open_incidents = [
            inc for inc in all_open_incidents
            if ensure_utc(inc.last_seen) >= window_start
        ]

        # Connect findings into clusters
        for f in active_findings:
            fid = f.finding_id
            matched_cluster_indices = []
            for idx, cluster in enumerate(clusters):
                if any(shares_entity(fid, other_fid) for other_fid in cluster):
                    matched_cluster_indices.append(idx)

            if not matched_cluster_indices:
                clusters.append({fid})
            elif len(matched_cluster_indices) == 1:
                clusters[matched_cluster_indices[0]].add(fid)
            else:
                # Merge multiple overlapping clusters
                merged = {fid}
                for idx in sorted(matched_cluster_indices, reverse=True):
                    merged |= clusters.pop(idx)
                clusters.append(merged)

        created_incidents: List[str] = []
        updated_incidents: List[str] = []
        uncorrelated_findings: List[str] = []

        # 4. Process each cluster with strict correlation eligibility
        for cluster_fids in clusters:
            cluster_findings = [finding_map[fid] for fid in cluster_fids]
            
            # Extract combined entities for cluster
            cluster_ips: Set[str] = set()
            cluster_users: Set[str] = set()
            cluster_hosts: Set[str] = set()
            for fid in cluster_fids:
                cluster_ips |= finding_entities[fid]["ips"]
                cluster_users |= finding_entities[fid]["users"]
                cluster_hosts |= finding_entities[fid]["hosts"]

            # Check if this cluster matches an existing open incident
            target_incident: Optional[Incident] = None
            for inc in open_incidents:
                inc_users = set(inc.affected_users or [])
                inc_hosts = set(inc.affected_hosts or [])
                inc_ips = set(inc.affected_ips or [])
                
                # Check entity overlap with existing incident
                if (cluster_users & inc_users) or (cluster_hosts & inc_hosts) or (cluster_ips & inc_ips):
                    min_finding_time = min(ensure_utc(f.created_at) for f in cluster_findings)
                    if ensure_utc(inc.last_seen) >= (min_finding_time - timedelta(seconds=window_seconds)):
                        target_incident = inc
                        break

            # Determine participating agents and distinct findings
            participating_agents = sorted(list({f.agent_name for f in cluster_findings}))
            all_cluster_events: List[SecurityEvent] = []
            for fid in cluster_fids:
                all_cluster_events.extend(finding_events[fid])

            # Deduplicate events by event_id
            seen_eids = set()
            unique_cluster_events = []
            for e in all_cluster_events:
                if e.event_id not in seen_eids:
                    seen_eids.add(e.event_id)
                    unique_cluster_events.append(e)

            pivot_entity = (
                next(iter(cluster_hosts), None) or
                next(iter(cluster_users), None) or
                next(iter(cluster_ips), None) or
                "unknown_entity"
            )

            # Extract provenance for each finding in cluster
            finding_provenance: Dict[str, Set[str]] = {}
            for f in cluster_findings:
                eids = {
                    str(eid).strip() for eid in (f.source_event_ids or (f.evidence.get("event_ids", []) if isinstance(f.evidence, dict) else []))
                    if eid and str(eid).strip()
                }
                if not eids and f.evidence and isinstance(f.evidence, dict) and f.evidence.get("event_id"):
                    eids.add(str(f.evidence["event_id"]).strip())
                finding_provenance[f.finding_id] = eids

            findings_with_provenance = [f for f in cluster_findings if finding_provenance[f.finding_id]]
            distinct_source_events = {
                eid for f in findings_with_provenance for eid in finding_provenance[f.finding_id]
            } | {e.event_id for e in unique_cluster_events}

            # STRICT ELIGIBILITY CHECK:
            # 1. A new incident always requires at least TWO distinct findings with valid provenance,
            #    at least TWO distinct source events, and cross-agent diversity (at least TWO distinct specialized agents).
            # 2. Findings with missing provenance cannot silently qualify as independent corroborating evidence.
            # 3. A new finding derived from the same source event must not be counted as independent corroborating evidence.
            if target_incident is None:
                if len(findings_with_provenance) < 2 or len(distinct_source_events) < 2 or len(participating_agents) < 2:
                    for lone_f in cluster_findings:
                        uncorrelated_findings.append(lone_f.finding_id)
                        if lone_f.incident_id is not None:
                            lone_f.incident_id = None
                            self.db.commit()
                    self.log(
                        "INFO",
                        f"Cluster '{pivot_entity}' remains uncorrelated: insufficient corroboration "
                        f"({len(findings_with_provenance)} valid finding(s), {len(distinct_source_events)} event(s), "
                        f"{len(participating_agents)} agent(s); threshold requires >= 2 distinct agents, >= 2 findings, and >= 2 events)."
                    )
                    continue

            # Max severity determination
            sev_levels = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1, "INFO": 0}
            max_sev = "MEDIUM"
            highest_rank = 2
            for f in cluster_findings:
                rank = sev_levels.get(f.severity.upper(), 2)
                if rank > highest_rank:
                    highest_rank = rank
                    max_sev = f.severity.upper()

            # Formulate correlation reasons
            correlation_reasons = []
            shared_parts = []
            if cluster_ips:
                shared_parts.append(f"IP(s): {', '.join(sorted(list(cluster_ips))[:3])}")
            if cluster_users:
                shared_parts.append(f"User(s): {', '.join(sorted(list(cluster_users))[:3])}")
            if cluster_hosts:
                shared_parts.append(f"Host(s): {', '.join(sorted(list(cluster_hosts))[:3])}")
            
            correlation_reasons.append(f"Entity overlap: {'; '.join(shared_parts)}")
            correlation_reasons.append(
                f"Multi-agent correlation: {len(cluster_findings)} findings across {len(participating_agents)} agent(s) "
                f"({', '.join(participating_agents)}) within {window_seconds}s window."
            )
            correlation_reasons.append(f"Correlated finding IDs: {', '.join(sorted(list(cluster_fids)))}")

            # Temporal boundaries
            timestamps = [ensure_utc(f.created_at) for f in cluster_findings if f.created_at]
            for e in unique_cluster_events:
                if e.timestamp:
                    timestamps.append(ensure_utc(e.timestamp))
            first_seen = min(timestamps) if timestamps else now
            last_seen = max(timestamps) if timestamps else now

            is_sim = any(e.is_simulated for e in unique_cluster_events)

            if target_incident:
                # =========================================================
                # UPDATE EXISTING INCIDENT (Idempotent update preserving ID)
                # =========================================================
                inc_id = target_incident.incident_id

                # Query existing incident events and findings
                existing_incident_events = {
                    rel.event_id for rel in self.db.query(IncidentEvent).filter(IncidentEvent.incident_id == inc_id).all()
                }
                existing_incident_findings = {
                    rel.finding_id for rel in self.db.query(IncidentFinding).filter(IncidentFinding.incident_id == inc_id).all()
                }

                # Filter cluster findings to only those that are genuinely related to this incident
                # and possess valid event provenance
                valid_related_findings: List[AgentFinding] = []
                inc_users = set(target_incident.affected_users or [])
                inc_hosts = set(target_incident.affected_hosts or [])
                inc_ips = set(target_incident.affected_ips or [])

                for f in cluster_findings:
                    f_ent = finding_entities.get(f.finding_id, {"ips": set(), "users": set(), "hosts": set()})
                    is_entity_related = bool(
                        (f_ent["users"] & inc_users) or
                        (f_ent["hosts"] & inc_hosts) or
                        (f_ent["ips"] & inc_ips)
                    )
                    within_window = ensure_utc(target_incident.last_seen) >= (ensure_utc(f.created_at) - timedelta(seconds=window_seconds))
                    has_provenance = bool(finding_provenance.get(f.finding_id))

                    if is_entity_related and within_window and has_provenance:
                        valid_related_findings.append(f)
                    else:
                        uncorrelated_findings.append(f.finding_id)
                        if f.incident_id == inc_id:
                            f.incident_id = None
                            self.db.commit()

                if not valid_related_findings:
                    self.log("INFO", f"No valid related findings to update incident {inc_id}.")
                    continue

                # Merge entities from valid related findings
                for f in valid_related_findings:
                    cluster_ips |= finding_entities[f.finding_id]["ips"]
                    cluster_users |= finding_entities[f.finding_id]["users"]
                    cluster_hosts |= finding_entities[f.finding_id]["hosts"]

                target_incident.affected_users = sorted(list(set(target_incident.affected_users or []) | cluster_users))
                target_incident.affected_hosts = sorted(list(set(target_incident.affected_hosts or []) | cluster_hosts))
                target_incident.affected_ips = sorted(list(set(target_incident.affected_ips or []) | cluster_ips))
                target_incident.last_seen = max(ensure_utc(target_incident.last_seen or first_seen), last_seen)

                # Link findings and handle duplicate enrichment vs genuinely new related events
                new_finding_linked = False
                new_events_introduced = False

                for f in valid_related_findings:
                    f_eids = finding_provenance[f.finding_id]
                    # Check if finding brings genuinely new source event(s)
                    is_new_event = bool(f_eids - existing_incident_events)
                    
                    # Check if this exact finding is already linked
                    existing_link = self.db.query(IncidentFinding).filter(
                        IncidentFinding.incident_id == inc_id,
                        IncidentFinding.finding_id == f.finding_id
                    ).first()

                    # Check if duplicate enrichment from the same agent on the same events already exists
                    duplicate_same_agent_finding = None
                    if not is_new_event:
                        for ef_link in self.db.query(IncidentFinding).filter(
                            IncidentFinding.incident_id == inc_id,
                            IncidentFinding.agent_name == f.agent_name
                        ).all():
                            if ef_link.finding_id != f.finding_id:
                                ef = self.db.query(AgentFinding).filter(AgentFinding.finding_id == ef_link.finding_id).first()
                                if ef and finding_provenance.get(ef.finding_id, set()) == f_eids:
                                    duplicate_same_agent_finding = ef
                                    break

                    if duplicate_same_agent_finding:
                        # Duplicate enrichment must update existing evidence rather than inflate count
                        if isinstance(f.evidence, dict) and isinstance(duplicate_same_agent_finding.evidence, dict):
                            duplicate_same_agent_finding.evidence = {**duplicate_same_agent_finding.evidence, **f.evidence}
                        if sev_levels.get(f.severity.upper(), 0) > sev_levels.get(duplicate_same_agent_finding.severity.upper(), 0):
                            duplicate_same_agent_finding.severity = f.severity.upper()
                        f.incident_id = inc_id
                        continue

                    if not existing_link:
                        self.db.add(IncidentFinding(
                            incident_id=inc_id,
                            finding_id=f.finding_id,
                            agent_name=f.agent_name,
                            added_at=now
                        ))
                        f.incident_id = inc_id
                        new_finding_linked = True

                    # Link any new source events
                    for eid in f_eids:
                        if eid not in existing_incident_events:
                            evt_obj = self.db.query(SecurityEvent).filter(SecurityEvent.event_id == eid).first()
                            if evt_obj:
                                self.db.add(IncidentEvent(
                                    incident_id=inc_id,
                                    event_id=eid,
                                    sequence_order=len(existing_incident_events),
                                    added_at=now
                                ))
                                existing_incident_events.add(eid)
                                new_events_introduced = True

                    # Update participating agents
                    if f.agent_name not in (target_incident.participating_agents or []):
                        target_incident.participating_agents = sorted(list(set(target_incident.participating_agents or []) | {f.agent_name}))

                    # Elevate severity if higher
                    if sev_levels.get(f.severity.upper(), 0) > sev_levels.get(target_incident.severity, 0):
                        target_incident.severity = f.severity.upper()

                # Flush pending adds before count queries
                self.db.flush()

                # Refresh counts
                total_db_events = self.db.query(IncidentEvent).filter(IncidentEvent.incident_id == inc_id).count()
                total_db_findings = self.db.query(IncidentFinding).filter(IncidentFinding.incident_id == inc_id).count()
                target_incident.event_count = max(total_db_events, len(existing_incident_events))

                # If genuinely new events were introduced by the new finding, update finding_count;
                # duplicate enrichments on existing events do not inflate finding_count.
                if new_events_introduced:
                    target_incident.finding_count = max(target_incident.finding_count or 0, total_db_findings)

                # Update correlation reasons
                merged_reasons = list(target_incident.correlation_reasons or [])
                for r in correlation_reasons:
                    if r not in merged_reasons:
                        merged_reasons.append(r)
                target_incident.correlation_reasons = merged_reasons
                target_incident.updated_at = now

                # Audit log if new findings or events arrived
                if new_finding_linked or new_events_introduced:
                    self.db.add(IncidentAudit(
                        incident_id=inc_id,
                        actor="Correlation Agent",
                        action="INCIDENT_UPDATED",
                        previous_state=target_incident.status,
                        new_state=target_incident.status,
                        timestamp=now
                    ))

                self.db.commit()
                updated_incidents.append(inc_id)
                self.log("INFO", f"Updated existing incident {inc_id} (Preserved ID) with findings: {[f.finding_id for f in valid_related_findings]}.")

            else:
                # =========================================================
                # CREATE NEW CORRELATED INCIDENT (>= 2 distinct findings)
                # =========================================================
                inc_id = f"INC-{now.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"

                pivot_entity = (
                    next(iter(cluster_hosts), None) or
                    next(iter(cluster_users), None) or
                    next(iter(cluster_ips), None) or
                    "Enterprise Infrastructure"
                )

                if "Authentication Agent" in participating_agents and "Endpoint Agent" in participating_agents:
                    title = f"Multi-Stage Account Compromise & Endpoint Execution ({pivot_entity})"
                elif "Network Monitoring Agent" in participating_agents and "Threat Intelligence Agent" in participating_agents:
                    title = f"Correlated Network Intrusion & Threat Intel Match ({pivot_entity})"
                elif "Network Monitoring Agent" in participating_agents and "Endpoint Agent" in participating_agents:
                    title = f"Network Ingress Followed by Host Execution ({pivot_entity})"
                elif len(participating_agents) >= 2:
                    title = f"Multi-Agent Correlated Threat Sequence ({pivot_entity})"
                else:
                    title = f"Multi-Finding Correlated Detection ({pivot_entity})"

                base_risk = 75 if max_sev == "CRITICAL" else (60 if max_sev == "HIGH" else 45)
                conf_avg = round(sum(f.confidence for f in findings_with_provenance) / len(findings_with_provenance), 2)

                new_inc = Incident(
                    incident_id=inc_id,
                    title=title,
                    description=(
                        f"Correlated {len(findings_with_provenance)} distinct findings across "
                        f"{len(participating_agents)} specialized agent(s) ({', '.join(participating_agents)}) "
                        f"linked to entity '{pivot_entity}' within {window_seconds}s correlation window."
                    ),
                    severity=max_sev,
                    risk_score=base_risk,
                    confidence=conf_avg,
                    status="NEW",
                    first_seen=first_seen,
                    last_seen=last_seen,
                    affected_users=sorted(list(cluster_users)),
                    affected_hosts=sorted(list(cluster_hosts)),
                    affected_ips=sorted(list(cluster_ips)),
                    event_count=max(len(unique_cluster_events), len(distinct_source_events)),
                    finding_count=len(findings_with_provenance),
                    participating_agents=participating_agents,
                    correlation_reasons=correlation_reasons,
                    correlation_window_seconds=window_seconds,
                    assigned_analyst="Unassigned",
                    investigation_status="PENDING",
                    response_status="RECOMMENDED" if max_sev in ["HIGH", "CRITICAL"] else "NONE",
                    is_simulated=is_sim,
                    created_at=now,
                    updated_at=now
                )
                self.db.add(new_inc)
                self.db.commit()

                # Link findings with valid provenance to incident
                for f in findings_with_provenance:
                    f.incident_id = inc_id
                    self.db.add(IncidentFinding(
                        incident_id=inc_id,
                        finding_id=f.finding_id,
                        agent_name=f.agent_name,
                        added_at=now
                    ))

                # Link events to incident
                linked_event_ids = set()
                seq_idx = 0
                for e in unique_cluster_events:
                    self.db.add(IncidentEvent(
                        incident_id=inc_id,
                        event_id=e.event_id,
                        sequence_order=seq_idx,
                        added_at=now
                    ))
                    linked_event_ids.add(e.event_id)
                    seq_idx += 1

                for eid in distinct_source_events:
                    if eid not in linked_event_ids:
                        self.db.add(IncidentEvent(
                            incident_id=inc_id,
                            event_id=eid,
                            sequence_order=seq_idx,
                            added_at=now
                        ))
                        linked_event_ids.add(eid)
                        seq_idx += 1

                # Audit log
                self.db.add(IncidentAudit(
                    incident_id=inc_id,
                    actor="Correlation Agent",
                    action="INCIDENT_CREATED",
                    previous_state=None,
                    new_state="NEW",
                    timestamp=now
                ))
                self.db.commit()
                created_incidents.append(inc_id)

                self.log(
                    "INFO",
                    f"Created correlated incident {inc_id} ({title}) with {len(cluster_findings)} "
                    f"findings from {participating_agents}."
                )

        all_incident_ids = list(set(created_incidents + updated_incidents))
        return {
            "total_findings_evaluated": len(active_findings),
            "clusters_evaluated": len(clusters),
            "incidents_created": created_incidents,
            "incidents_updated": updated_incidents,
            "incident_ids": all_incident_ids,
            "uncorrelated_findings": uncorrelated_findings
        }
