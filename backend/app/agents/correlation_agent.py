"""
CorrelationAgent — Spatial-Temporal Multi-Signal Clustering Engine

Architectural Rules & Invariants:
1. MINIMUM FINDINGS & EVENTS: A correlated multi-agent incident requires at least 2 distinct
   findings with verified event provenance and at least 2 distinct source events.
2. CORRELATION TIME WINDOW: Findings and events must fall within the correlation window
   (default 900 seconds / 15 minutes).
3. ACTOR-BASED ENTITY CLUSTERING: Ingress attacks are clustered primarily by threat actor
   (source_ip) or targeted identity (username). Multiple distinct external IPs hitting the same
   destination host must NEVER be merged into a single incident unless they share a specific
   compromised account identity or internal lateral movement chain.
4. CROSS-AGENT DIVERSITY: Correlated incidents represent progression across >= 2 specialized
   detection agent domains (or valid multi-event progression when evaluated at telemetry level).
5. IDEMPOTENT UPDATES & PRESERVED IDENTITY: Re-processing identical evidence updates existing
   incidents without duplicate IncidentFinding/IncidentEvent links and preserves incident IDs.
"""
import uuid
from typing import Dict, Any, List, Set, Optional
from datetime import datetime, timezone, timedelta
from app.agents.base import BaseAgent
from app.models.agent import AgentFinding
from app.models.event import SecurityEvent
from app.models.incident import Incident, IncidentEvent, IncidentFinding, IncidentAudit
from app.services.time_utils import ensure_utc

CORRELATION_WINDOW_SECONDS: int = 300   # 5 minutes default correlation window
MIN_EVENTS: int = 2                     # minimum distinct events to open an incident

SPECIALIZED_DETECTION_AGENTS = [
    "Network Monitoring Agent",
    "Authentication Agent",
    "Endpoint Agent",
    "Malicious Behaviour Agent",
    "Anomaly Detection Agent",
    "Threat Intelligence Agent"
]

# Meaningful security relationships between event types.
# A frozenset pair that appears here is considered "related".
RELATED_EVENT_TYPE_PAIRS: Set[frozenset] = {
    frozenset({"network_connection", "authentication"}),          # recon → credential attack
    frozenset({"network_connection", "process_execution"}),       # C2 → payload execution
    frozenset({"network_connection", "file_access"}),             # exfil
    frozenset({"authentication", "privilege_escalation"}),        # credential abuse → priv esc
    frozenset({"authentication", "process_execution"}),           # login → lateral exec
    frozenset({"authentication", "file_access"}),                 # login → data access
    frozenset({"privilege_escalation", "file_access"}),           # priv esc → data access
    frozenset({"privilege_escalation", "process_execution"}),     # priv esc → exec
    frozenset({"process_execution", "file_access"}),              # malware → file writes
    # Same-type pairs that indicate progression
    frozenset({"authentication"}),                                # multiple auth events (brute force)
    frozenset({"network_connection"}),                           # port scan (multiple conn)
}


def _extract_attack_category(finding: AgentFinding) -> str:
    """Classify agent finding into canonical MITRE / SOC attack phase."""
    title = (finding.title or "").lower()
    ev = finding.evidence if isinstance(finding.evidence, dict) else {}
    tech = str(ev.get("mitre_technique") or "").upper()
    scen = str(ev.get("scenario_id") or "").lower()

    if any(k in title for k in ["invalid user", "login", "password", "brute force", "credential", "auth failure"]) or tech.startswith("T1110") or "auth" in scen:
        return "CREDENTIAL_INITIAL_ACCESS"
    if any(k in title for k in ["port scan", "port sweep", "service banner", "reconnaissance", "recon", "discovery", "nmap"]) or tech.startswith("T1046") or "recon" in scen:
        return "RECONNAISSANCE"
    if any(k in title for k in ["http burst", "web application resource", "exhaustion", "denial of service", "traffic burst", "web_http"]) or tech.startswith("T1499") or tech.startswith("T1498") or "burst" in scen:
        return "DENIAL_OF_SERVICE"
    if any(k in title for k in ["exfiltration", "data staging", "sensitive data", "data movement", "stolen data"]) or tech.startswith("T1048") or tech.startswith("T1041") or "exfil" in scen or "data" in scen:
        return "DATA_EXFILTRATION"
    if any(k in title for k in ["privilege escalation", "sudo", "process lineage", "command execution", "execution token"]) or tech.startswith("T1059") or tech.startswith("T1548") or "priv" in scen or "exec" in scen:
        return "EXECUTION_PRIVILEGE_ESCALATION"
    if any(k in title for k in ["beaconing", "command & control", "c2", "intrusion flow"]):
        return "C2_PERSISTENCE"

    return finding.agent_name or "GENERIC_DETECTION"


def _format_stage_label(category: str) -> str:
    labels = {
        "RECONNAISSANCE": "Network Reconnaissance",
        "CREDENTIAL_INITIAL_ACCESS": "SSH Credential Probing",
        "DENIAL_OF_SERVICE": "Application Denial of Service",
        "DATA_EXFILTRATION": "Data Staging & Exfiltration",
        "EXECUTION_PRIVILEGE_ESCALATION": "Privilege Escalation & Execution",
        "C2_PERSISTENCE": "Command & Control Communication",
    }
    return labels.get(category, category.replace("_", " ").title())


def _types_are_related(event_types: Set[str]) -> bool:
    """
    Return True when the observed combination of event types has at least one
    meaningful security relationship defined in RELATED_EVENT_TYPE_PAIRS.
    """
    if not event_types:
        return False
    if len(event_types) == 1:
        return frozenset(event_types) in RELATED_EVENT_TYPE_PAIRS
    types_list = list(event_types)
    for i in range(len(types_list)):
        for j in range(i + 1, len(types_list)):
            if frozenset({types_list[i], types_list[j]}) in RELATED_EVENT_TYPE_PAIRS:
                return True
    return False


def _within_time_window(events: List[SecurityEvent], window_seconds: int) -> bool:
    """Return True if all events fall within the specified time window."""
    timestamps = [e.timestamp for e in events if e.timestamp is not None]
    if not timestamps:
        return True
    earliest = min(timestamps)
    latest = max(timestamps)
    if earliest.tzinfo is None:
        earliest = earliest.replace(tzinfo=timezone.utc)
    if latest.tzinfo is None:
        latest = latest.replace(tzinfo=timezone.utc)
    return (latest - earliest).total_seconds() <= window_seconds


class CorrelationAgent(BaseAgent):
    name = "Correlation Agent"
    role = "Incident Synthesis & Alert Aggregator"
    description = "Correlates persisted findings across specialized agents within a 15-minute window, enforcing strict multi-finding eligibility."

    def analyze(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Correlates persisted findings from specialized detection agents, or directly correlates
        events when evaluating raw telemetry batches.
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

        # 2. If NO specialized agent findings exist, fallback to direct event correlation
        context_events: List[SecurityEvent] = context.get("events", [])
        if not active_findings:
            if context_events:
                self.log("INFO", f"No agent findings found; evaluating {len(context_events)} raw telemetry events directly.")
                return self._correlate_events_directly(context_events, window_seconds, now)

            self.log("INFO", "No specialized agent findings or events available in correlation window.")
            return {
                "total_findings_evaluated": 0,
                "clusters_evaluated": 0,
                "incidents_created": 0,
                "incidents_updated": 0,
                "incident_ids": [],
                "uncorrelated_findings": []
            }

        self.log("INFO", f"Evaluating correlation across {len(active_findings)} active agent findings (Window: {window_seconds}s)")

        # 3. Extract segregated entities for each finding
        # Actor IPs (source_ips) are isolated from target IPs (dest_ips) and target hosts
        finding_entities: Dict[str, Dict[str, Set[str]]] = {}
        finding_events: Dict[str, List[SecurityEvent]] = {}
        finding_map: Dict[str, AgentFinding] = {f.finding_id: f for f in active_findings}

        for f in active_findings:
            source_ips: Set[str] = set()
            dest_ips: Set[str] = set()
            users: Set[str] = set()
            hosts: Set[str] = set()

            ev = f.evidence if isinstance(f.evidence, dict) else {}

            for key in ["source_ip", "source", "attacker_ip", "client_ip", "indicator"]:
                val = ev.get(key)
                if val and isinstance(val, str) and not any(val.startswith(p) for p in ["127.", "localhost"]):
                    source_ips.add(val.strip())

            for key in ["destination_ip", "target_ip", "dest_ip"]:
                val = ev.get(key)
                if val and isinstance(val, str) and not any(val.startswith(p) for p in ["127.", "localhost"]):
                    dest_ips.add(val.strip())

            for key in ["username", "user", "compromised_user"]:
                val = ev.get(key)
                if val and isinstance(val, str) and val.lower() not in ["none", "unknown", "system"]:
                    users.add(val.strip())

            if isinstance(ev.get("targeted_accounts"), list):
                for u in ev["targeted_accounts"]:
                    if u and isinstance(u, str) and u.lower() not in ["none", "unknown", "system"]:
                        users.add(u.strip())

            for key in ["host", "hostname"]:
                val = ev.get(key)
                if val and isinstance(val, str) and val.lower() not in ["none", "unknown", "network"]:
                    hosts.add(val.strip())

            for key in ["associated_hosts", "target_hosts"]:
                if isinstance(ev.get(key), list):
                    for h in ev[key]:
                        if h and isinstance(h, str) and h.lower() not in ["none", "unknown", "network"]:
                            hosts.add(h.strip())

            # Associated source events
            evt_ids = list(f.source_event_ids or [])
            if not evt_ids and "event_ids" in ev and isinstance(ev["event_ids"], list):
                evt_ids = [str(x) for x in ev["event_ids"]]

            events: List[SecurityEvent] = []
            if evt_ids:
                events = self.db.query(SecurityEvent).filter(SecurityEvent.event_id.in_(evt_ids)).all()
                for e in events:
                    if e.source_ip and not e.source_ip.startswith("127."):
                        source_ips.add(e.source_ip.strip())
                    if e.destination_ip and not e.destination_ip.startswith("127."):
                        dest_ips.add(e.destination_ip.strip())
                    if e.username and e.username.lower() not in ["none", "unknown"]:
                        users.add(e.username.strip())
                    if e.host and e.host.lower() not in ["none", "unknown"]:
                        hosts.add(e.host.strip())

            finding_entities[f.finding_id] = {
                "source_ips": source_ips,
                "dest_ips": dest_ips,
                "users": users,
                "hosts": hosts,
                "all_ips": source_ips | dest_ips
            }
            finding_events[f.finding_id] = events

        # 4. Graph clustering based on shared threat actor or compromised identity
        # Ingress attacks are partitioned by threat actor (source_ip) or compromised username.
        # Two findings on the same host can only correlate if neither has conflicting remote source IPs.
        clusters: List[Set[str]] = []

        def shares_entity(f1_id: str, f2_id: str) -> bool:
            ent1 = finding_entities[f1_id]
            ent2 = finding_entities[f2_id]

            # Direct threat actor source IP match
            if ent1["source_ips"] and ent2["source_ips"] and (ent1["source_ips"] & ent2["source_ips"]):
                return True

            # Direct targeted/compromised username match (e.g. distributed password spray)
            if ent1["users"] and ent2["users"] and (ent1["users"] & ent2["users"]):
                return True

            # Machine / Host-level correlation:
            # If two findings occur on or target the same machine (same host or same destination IP),
            # they correlate into the unified incident for that machine.
            if ent1["hosts"] and ent2["hosts"] and (ent1["hosts"] & ent2["hosts"]):
                return True

            if ent1["dest_ips"] and ent2["dest_ips"] and (ent1["dest_ips"] & ent2["dest_ips"]):
                return True

            return False

        # Retrieve open incidents active in window
        all_open_incidents = self.db.query(Incident).filter(
            Incident.status.in_(["NEW", "INVESTIGATING", "CONTAINED"])
        ).all()
        open_incidents = [
            inc for inc in all_open_incidents
            if ensure_utc(inc.last_seen) >= window_start
        ]

        # Build clusters
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
                merged = {fid}
                for idx in sorted(matched_cluster_indices, reverse=True):
                    merged |= clusters.pop(idx)
                clusters.append(merged)

        created_incidents: List[str] = []
        updated_incidents: List[str] = []
        uncorrelated_findings: List[str] = []

        # 5. Process each cluster with strict correlation eligibility
        for cluster_fids in clusters:
            cluster_findings = [finding_map[fid] for fid in cluster_fids]

            cluster_source_ips: Set[str] = set()
            cluster_dest_ips: Set[str] = set()
            cluster_users: Set[str] = set()
            cluster_hosts: Set[str] = set()

            for fid in cluster_fids:
                cluster_source_ips |= finding_entities[fid]["source_ips"]
                cluster_dest_ips |= finding_entities[fid]["dest_ips"]
                cluster_users |= finding_entities[fid]["users"]
                cluster_hosts |= finding_entities[fid]["hosts"]

            cluster_all_ips = cluster_source_ips | cluster_dest_ips

            # Check if this cluster matches an existing open incident
            target_incident: Optional[Incident] = None
            for inc in open_incidents:
                inc_users = set(inc.affected_users or [])
                inc_hosts = set(inc.affected_hosts or [])
                inc_ips = set(inc.affected_ips or [])

                matched = False
                # Correlate if matching actor IP, compromised user, OR target machine (host or destination IP)
                if (cluster_source_ips & inc_ips) or (cluster_dest_ips & inc_ips) or (cluster_users & inc_users) or (cluster_hosts & inc_hosts):
                    matched = True

                if matched:
                    min_finding_time = min(ensure_utc(f.created_at) for f in cluster_findings)
                    if ensure_utc(inc.last_seen) >= (min_finding_time - timedelta(seconds=window_seconds)):
                        target_incident = inc
                        break

            # Participating agents and events
            participating_agents = sorted(list({f.agent_name for f in cluster_findings}))
            all_cluster_events: List[SecurityEvent] = []
            for fid in cluster_fids:
                all_cluster_events.extend(finding_events[fid])

            seen_eids = set()
            unique_cluster_events = []
            for e in all_cluster_events:
                if e.event_id not in seen_eids:
                    seen_eids.add(e.event_id)
                    unique_cluster_events.append(e)

            # Determine primary pivot entity (actor IP > user > host)
            pivot_entity = (
                next(iter(cluster_source_ips), None) or
                next(iter(cluster_users), None) or
                next(iter(cluster_hosts), None) or
                "Enterprise Infrastructure"
            )

            # Provenance extraction
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

            # Severity determination
            sev_levels = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1, "INFO": 0}
            max_sev = "MEDIUM"
            highest_rank = 2
            for f in cluster_findings:
                rank = sev_levels.get(f.severity.upper(), 2)
                if rank > highest_rank:
                    highest_rank = rank
                    max_sev = f.severity.upper()

            # Extract distinct attack stages / categories across cluster findings
            cluster_categories = [_extract_attack_category(f) for f in cluster_findings]
            unique_categories = list(dict.fromkeys(cluster_categories))

            # ELIGIBILITY CHECK FOR NEW INCIDENTS:
            # An incident is created when:
            # 1. At least 2 findings with valid provenance
            # 2. At least 2 distinct source events
            # 3. Multi-stage attack progression (>= 2 distinct attack categories/vectors, e.g. SSH login + Exfil, Port scan + Web burst),
            #    cross-agent corroboration (>= 2 distinct specialized agents), multi-finding high-severity pattern (rank >= 3),
            #    or sustained medium-severity activity across >= 3 distinct events on the target machine.
            # 4. Note: A single isolated attack vector probe (e.g. only SSH invalid logins) remains uncorrelated awaiting secondary corroboration.
            if target_incident is None:
                has_valid_findings = len(findings_with_provenance) >= 2
                has_enough_events = len(distinct_source_events) >= 2
                has_corroboration = (
                    (len(unique_categories) >= 2)
                    or (len(participating_agents) >= 2)
                    or (highest_rank >= 3)
                    or (highest_rank >= 2 and len(distinct_source_events) >= 3)
                    or (len(cluster_hosts) >= 1 and len(findings_with_provenance) >= 2)
                )

                if not (has_valid_findings and has_enough_events and has_corroboration):
                    for lone_f in cluster_findings:
                        uncorrelated_findings.append(lone_f.finding_id)
                        if lone_f.incident_id is not None:
                            lone_f.incident_id = None
                            self.db.commit()
                    self.log(
                        "INFO",
                        f"Cluster '{pivot_entity}' remains uncorrelated: single attack vector probe awaiting secondary corroboration "
                        f"({len(findings_with_provenance)} finding(s), {len(distinct_source_events)} event(s), "
                        f"{len(participating_agents)} agent(s), categories: {unique_categories})."
                    )
                    continue

            # Formulate correlation reasons
            correlation_reasons = []
            shared_parts = []
            if cluster_source_ips:
                shared_parts.append(f"Attacker IP(s): {', '.join(sorted(list(cluster_source_ips))[:3])}")
            if cluster_users:
                shared_parts.append(f"Target User(s): {', '.join(sorted(list(cluster_users))[:3])}")
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
                # UPDATE EXISTING INCIDENT (Preserve ID, Deduplicate Links)
                # =========================================================
                inc_id = target_incident.incident_id

                existing_incident_events = {
                    rel.event_id for rel in self.db.query(IncidentEvent).filter(IncidentEvent.incident_id == inc_id).all()
                }
                existing_incident_findings = {
                    rel.finding_id for rel in self.db.query(IncidentFinding).filter(IncidentFinding.incident_id == inc_id).all()
                }

                valid_related_findings: List[AgentFinding] = []
                inc_users = set(target_incident.affected_users or [])
                inc_hosts = set(target_incident.affected_hosts or [])
                inc_ips = set(target_incident.affected_ips or [])

                for f in cluster_findings:
                    f_ent = finding_entities.get(f.finding_id, {"source_ips": set(), "users": set(), "hosts": set(), "all_ips": set()})
                    is_entity_related = bool(
                        (f_ent["users"] & inc_users) or
                        (f_ent["source_ips"] & inc_ips) or
                        (f_ent["hosts"] & inc_hosts and (not f_ent["source_ips"] or (f_ent["source_ips"] & inc_ips)))
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

                for f in valid_related_findings:
                    cluster_all_ips |= finding_entities[f.finding_id]["all_ips"]
                    cluster_users |= finding_entities[f.finding_id]["users"]
                    cluster_hosts |= finding_entities[f.finding_id]["hosts"]

                target_incident.affected_users = sorted(list(set(target_incident.affected_users or []) | cluster_users))
                target_incident.affected_hosts = sorted(list(set(target_incident.affected_hosts or []) | cluster_hosts))
                target_incident.affected_ips = sorted(list(set(target_incident.affected_ips or []) | cluster_all_ips))
                target_incident.last_seen = max(ensure_utc(target_incident.last_seen or first_seen), last_seen)

                new_finding_linked = False
                new_events_introduced = False

                for f in valid_related_findings:
                    f_eids = finding_provenance[f.finding_id]
                    is_new_event = bool(f_eids - existing_incident_events)

                    existing_link = self.db.query(IncidentFinding).filter(
                        IncidentFinding.incident_id == inc_id,
                        IncidentFinding.finding_id == f.finding_id
                    ).first()

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

                    if f.agent_name not in (target_incident.participating_agents or []):
                        target_incident.participating_agents = sorted(list(set(target_incident.participating_agents or []) | {f.agent_name}))

                    if sev_levels.get(f.severity.upper(), 0) > sev_levels.get(target_incident.severity, 0):
                        target_incident.severity = f.severity.upper()

                self.db.flush()

                total_db_events = self.db.query(IncidentEvent).filter(IncidentEvent.incident_id == inc_id).count()
                total_db_findings = self.db.query(IncidentFinding).filter(IncidentFinding.incident_id == inc_id).count()
                target_incident.event_count = max(total_db_events, len(existing_incident_events))

                if new_events_introduced:
                    target_incident.finding_count = max(target_incident.finding_count or 0, total_db_findings)

                stage_labels = [_format_stage_label(c) for c in unique_categories if c != "GENERIC_DETECTION"]
                target_label = next(iter(cluster_hosts), None) or next(iter(cluster_dest_ips), None) or pivot_entity
                if len(stage_labels) >= 2:
                    target_incident.title = f"Correlated Multi-Stage Campaign on {target_label}: {' -> '.join(stage_labels[:3])}"

                merged_reasons = list(target_incident.correlation_reasons or [])
                for r in correlation_reasons:
                    if r not in merged_reasons:
                        merged_reasons.append(r)
                if len(stage_labels) >= 2:
                    prog_reason = f"Multi-stage attack progression observed: {' -> '.join(stage_labels[:3])}"
                    if prog_reason not in merged_reasons:
                        merged_reasons.append(prog_reason)
                target_incident.correlation_reasons = merged_reasons
                target_incident.updated_at = now

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

                stage_labels = [_format_stage_label(c) for c in unique_categories if c != "GENERIC_DETECTION"]
                target_label = next(iter(cluster_hosts), None) or next(iter(cluster_dest_ips), None) or pivot_entity

                if len(stage_labels) >= 2:
                    title = f"Correlated Multi-Stage Campaign on {target_label}: {' -> '.join(stage_labels[:3])}"
                elif "Authentication Agent" in participating_agents and "Endpoint Agent" in participating_agents:
                    title = f"Multi-Stage Account Compromise & Endpoint Execution ({target_label})"
                elif "Network Monitoring Agent" in participating_agents and "Anomaly Detection Agent" in participating_agents:
                    title = f"Correlated Network Reconnaissance & Port Sweep ({target_label})"
                elif "Network Monitoring Agent" in participating_agents and "Threat Intelligence Agent" in participating_agents:
                    title = f"Correlated Network Intrusion & Threat Intel Match ({target_label})"
                elif "Network Monitoring Agent" in participating_agents and "Endpoint Agent" in participating_agents:
                    title = f"Network Ingress Followed by Host Execution ({target_label})"
                elif "Authentication Agent" in participating_agents and "Threat Intelligence Agent" in participating_agents:
                    title = f"Credential Attack from Known Malicious Indicator ({target_label})"
                elif "Authentication Agent" in participating_agents:
                    title = f"SSH / Credential Brute Force Attack ({target_label})"
                elif "Network Monitoring Agent" in participating_agents:
                    title = f"Network Reconnaissance & Port Scan ({target_label})"
                elif "Endpoint Agent" in participating_agents:
                    title = f"Host Compromise & Malicious Process Execution ({target_label})"
                elif len(participating_agents) >= 2:
                    title = f"Multi-Agent Correlated Threat Sequence ({target_label})"
                else:
                    title = f"Multi-Finding Correlated Detection ({target_label})"
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
                    affected_ips=sorted(list(cluster_all_ips)),
                    event_count=max(len(unique_cluster_events), len(distinct_source_events)),
                    finding_count=len(findings_with_provenance),
                    participating_agents=participating_agents,
                    correlation_reasons=correlation_reasons,
                    correlation_window_seconds=window_seconds,
                    assigned_analyst="Unassigned",
                    investigation_status="PENDING",
                    response_status=(
                        "RECOMMENDED" if max_sev in ["HIGH", "CRITICAL"] else "NONE"
                    ),
                    is_simulated=is_sim,
                    created_at=now,
                    updated_at=now
                )
                self.db.add(new_inc)
                self.db.commit()

                for f in findings_with_provenance:
                    f.incident_id = inc_id
                    self.db.add(IncidentFinding(
                        incident_id=inc_id,
                        finding_id=f.finding_id,
                        agent_name=f.agent_name,
                        added_at=now
                    ))

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
            "incidents_created": len(created_incidents),
            "incidents_updated": len(updated_incidents),
            "incident_ids": all_incident_ids,
            "created_incident_ids": created_incidents,
            "updated_incident_ids": updated_incidents,
            "uncorrelated_findings": uncorrelated_findings
        }

    def _correlate_events_directly(
        self,
        events: List[SecurityEvent],
        window_seconds: int,
        now: datetime
    ) -> Dict[str, Any]:
        """
        Direct event-level correlation used when analyzing raw telemetry batches
        without prior specialized AgentFinding records.
        """
        seen_ids: Set[str] = set()
        unique_events: List[SecurityEvent] = []
        for e in events:
            if e.event_id and e.event_id not in seen_ids:
                seen_ids.add(e.event_id)
                unique_events.append(e)

        clusters: Dict[str, List[SecurityEvent]] = {}
        for evt in unique_events:
            key = evt.source_ip or evt.username or evt.host or "unassigned_cluster"
            clusters.setdefault(key, []).append(evt)

        created_incidents: List[str] = []
        updated_incidents: List[str] = []

        all_open_incidents = self.db.query(Incident).filter(
            Incident.status.in_(["NEW", "INVESTIGATING", "CONTAINED"])
        ).all()

        for pivot_key, cluster_events in clusters.items():
            seen_in_cluster: Set[str] = set()
            deduped: List[SecurityEvent] = []
            for e in cluster_events:
                if e.event_id not in seen_in_cluster:
                    seen_in_cluster.add(e.event_id)
                    deduped.append(e)
            cluster_events = deduped

            # Minimum events gate
            if len(cluster_events) < MIN_EVENTS:
                continue

            # Time window gate
            if not _within_time_window(cluster_events, window_seconds):
                continue

            # Security relationship gate
            event_types: Set[str] = {e.event_type for e in cluster_events if e.event_type}
            if not _types_are_related(event_types):
                continue

            # Max severity
            sev_levels = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1, "INFO": 0}
            max_sev = "MEDIUM"
            highest_rank = 2
            for e in cluster_events:
                rank = sev_levels.get(e.severity.upper() if e.severity else "MEDIUM", 2)
                if rank > highest_rank:
                    highest_rank = rank
                    max_sev = e.severity.upper()

            # Check matching open incident
            target_incident: Optional[Incident] = None
            for inc in all_open_incidents:
                inc_ips = set(inc.affected_ips or [])
                inc_users = set(inc.affected_users or [])
                inc_hosts = set(inc.affected_hosts or [])
                if (pivot_key in inc_ips) or (pivot_key in inc_users) or (pivot_key in inc_hosts):
                    target_incident = inc
                    break

            timestamps = [ensure_utc(e.timestamp) for e in cluster_events if e.timestamp]
            first_seen = min(timestamps) if timestamps else now
            last_seen = max(timestamps) if timestamps else now
            is_sim = any(e.is_simulated for e in cluster_events)

            cluster_ips = {e.source_ip for e in cluster_events if e.source_ip} | {e.destination_ip for e in cluster_events if e.destination_ip}
            cluster_users = {e.username for e in cluster_events if e.username}
            cluster_hosts = {e.host for e in cluster_events if e.host}

            if target_incident:
                inc_id = target_incident.incident_id
                existing_eids = {
                    rel.event_id for rel in self.db.query(IncidentEvent).filter(IncidentEvent.incident_id == inc_id).all()
                }

                new_events_linked = False
                for e in cluster_events:
                    if e.event_id not in existing_eids:
                        self.db.add(IncidentEvent(
                            incident_id=inc_id,
                            event_id=e.event_id,
                            sequence_order=len(existing_eids),
                            added_at=now
                        ))
                        existing_eids.add(e.event_id)
                        new_events_linked = True

                target_incident.event_count = len(existing_eids)
                target_incident.last_seen = max(ensure_utc(target_incident.last_seen or first_seen), last_seen)
                if sev_levels.get(max_sev, 0) > sev_levels.get(target_incident.severity, 0):
                    target_incident.severity = max_sev

                if new_events_linked:
                    self.db.add(IncidentAudit(
                        incident_id=inc_id,
                        actor="Correlation Agent",
                        action="INCIDENT_UPDATED",
                        previous_state=target_incident.status,
                        new_state=target_incident.status,
                        timestamp=now
                    ))
                    updated_incidents.append(inc_id)

                self.db.commit()

            else:
                inc_id = f"INC-{now.strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
                pivot_entity = pivot_key

                if "authentication" in event_types and "privilege_escalation" in event_types:
                    title = f"Multi-Stage Account Compromise & Privilege Escalation ({pivot_entity})"
                elif "network_connection" in event_types and "authentication" in event_types:
                    title = f"Network Reconnaissance & Credential Attack ({pivot_entity})"
                elif "authentication" in event_types:
                    title = f"SSH / Credential Brute Force Attack ({pivot_entity})"
                elif "network_connection" in event_types:
                    title = f"Network Reconnaissance & Port Scan ({pivot_entity})"
                else:
                    title = f"Correlated Multi-Event Attack Sequence ({pivot_entity})"

                base_risk = 75 if max_sev == "CRITICAL" else (60 if max_sev == "HIGH" else 45)

                new_inc = Incident(
                    incident_id=inc_id,
                    title=title,
                    description=f"Correlated {len(cluster_events)} security telemetry events around entity '{pivot_entity}'.",
                    severity=max_sev,
                    risk_score=base_risk,
                    confidence=0.88,
                    status="NEW",
                    first_seen=first_seen,
                    last_seen=last_seen,
                    affected_users=sorted(list(cluster_users)),
                    affected_hosts=sorted(list(cluster_hosts)),
                    affected_ips=sorted(list(cluster_ips)),
                    event_count=len(cluster_events),
                    finding_count=0,
                    participating_agents=["Correlation Agent"],
                    correlation_reasons=[
                        f"Direct event correlation: {len(cluster_events)} events sharing '{pivot_key}' within {window_seconds}s.",
                        f"Observed event types: {', '.join(sorted(list(event_types)))}."
                    ],
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

                for idx, e in enumerate(cluster_events):
                    self.db.add(IncidentEvent(
                        incident_id=inc_id,
                        event_id=e.event_id,
                        sequence_order=idx,
                        added_at=now
                    ))

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

        all_incident_ids = list(set(created_incidents + updated_incidents))
        return {
            "total_findings_evaluated": 0,
            "clusters_evaluated": len(clusters),
            "incidents_created": len(created_incidents),
            "incidents_updated": len(updated_incidents),
            "incident_ids": all_incident_ids,
            "created_incident_ids": created_incidents,
            "updated_incident_ids": updated_incidents,
            "uncorrelated_findings": []
        }
