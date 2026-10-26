from typing import Dict, Any, List
from app.agents.base import BaseAgent
from app.models.incident import Incident, IncidentEvent
from app.models.event import SecurityEvent

class AttackPathAgent(BaseAgent):
    name = "Attack-Path Analysis Agent"
    role = "Graph-Based Threat Topology Specialist"
    description = "Examines entity relationships and traces multi-hop adversarial traversal across enterprise infrastructure."

    def analyze(self, context: Dict[str, Any]) -> Dict[str, Any]:
        incident_id = context.get("incident_id")
        events: List[SecurityEvent] = context.get("events", [])
        
        target_inc = None
        if incident_id:
            target_inc = self.db.query(Incident).filter(Incident.incident_id == incident_id).first()
        elif events:
            # Look up incident for first event
            rel = self.db.query(IncidentEvent).filter(IncidentEvent.event_id == events[0].event_id).first()
            if rel:
                target_inc = self.db.query(Incident).filter(Incident.incident_id == rel.incident_id).first()

        nodes = []
        edges = []
        node_ids = set()

        def add_node(nid: str, label: str, ntype: str, status: str = "suspicious", details: Dict = None):
            if nid not in node_ids:
                nodes.append({
                    "id": nid,
                    "label": label,
                    "type": ntype,  # source_ip, account, endpoint, server, resource
                    "status": status,  # compromised, attacker, target, affected, safe
                    "details": details or {}
                })
                node_ids.add(nid)

        def add_edge(src: str, dst: str, relation: str, stage: str, confidence: float = 0.9, confirmed: bool = True):
            edges.append({
                "id": f"edge-{src}-{dst}-{relation}",
                "source": src,
                "target": dst,
                "relation": relation,
                "stage": stage,
                "confidence": confidence,
                "status": "confirmed" if confirmed else "inferred"
            })

        # Build graph from chronological events
        sorted_events = sorted(events, key=lambda x: x.timestamp or x.created_at)

        for e in sorted_events:
            # 1. External / Source IP
            src_ip = e.source_ip
            if src_ip:
                add_node(f"ip:{src_ip}", src_ip, "source_ip", "attacker", {"ip": src_ip, "port": e.source_port})

            # 2. User Account
            user = e.username
            if user:
                add_node(f"user:{user}", user, "account", "compromised", {"username": user, "host": e.host})

            # 3. Host / Endpoint
            host = e.host
            if host:
                is_server = any(s in host.lower() for s in ["srv", "server", "dc", "db", "prod"])
                htype = "server" if is_server else "endpoint"
                add_node(f"host:{host}", host, htype, "affected", {"hostname": host, "type": htype})

            # 4. Destination IP / Server
            dst_ip = e.destination_ip
            if dst_ip and dst_ip != src_ip:
                add_node(f"dst:{dst_ip}", dst_ip, "server", "target", {"ip": dst_ip, "port": e.destination_port})

            # 5. Sensitive File / Resource
            fpath = e.file_path
            if fpath:
                add_node(f"res:{fpath}", fpath.split('/')[-1].split('\\')[-1], "resource", "target", {"path": fpath})

            # Create Relationships / Edges
            if src_ip and user:
                add_edge(f"ip:{src_ip}", f"user:{user}", "authenticates_via", "Initial Access", 0.95)

            if user and host:
                add_edge(f"user:{user}", f"host:{host}", "controls_session", "Execution", 0.92)

            if host and dst_ip:
                add_edge(f"host:{host}", f"dst:{dst_ip}", "lateral_connect", "Lateral Movement", 0.88)

            if host and fpath:
                add_edge(f"host:{host}", f"res:{fpath}", "accesses_resource", "Collection & Staging", 0.94)

        attack_path_graph = {
            "nodes": nodes,
            "edges": edges,
            "summary_path": " → ".join([n["label"] for n in nodes[:5]]) if nodes else "Direct Event"
        }

        if target_inc:
            target_inc.attack_path_json = attack_path_graph
            self.db.commit()

        self.record_finding(
            title=f"Attack-Path Graph Synthesized ({len(nodes)} entities, {len(edges)} transitions)",
            severity="MEDIUM" if len(edges) < 3 else "HIGH",
            confidence=0.91,
            description=f"Generated topological attack progression graph across {len(nodes)} distinct network and identity entities.",
            evidence={
                "incident_id": incident_id or (target_inc.incident_id if target_inc else "unassigned"),
                "node_count": len(nodes),
                "edge_count": len(edges),
                "progression": attack_path_graph["summary_path"]
            },
            recommendations=[
                "Deploy network segmentation between affected endpoint and internal sensitive databases",
                "Review perimeter ingress rules for malicious source node"
            ]
        )

        return {
            "graph": attack_path_graph,
            "entities_mapped": len(nodes),
            "hops_discovered": len(edges)
        }
