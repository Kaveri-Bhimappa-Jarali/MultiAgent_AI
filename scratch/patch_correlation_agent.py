path = 'backend/app/agents/correlation_agent.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''            # STRICT ELIGIBILITY CHECK:
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
                    continue'''

replacement = '''            # STRICT ELIGIBILITY CHECK:
            # 1. A new incident requires cross-domain corroboration: at least TWO distinct primary detection domains
            #    (e.g. Authentication + Endpoint, or Authentication + Network, or Endpoint + Malicious Behaviour).
            # 2. A single detection domain (e.g. brute force only) remains quarantined as an un-correlated finding.
            # 3. At least TWO distinct findings with valid provenance and at least TWO distinct source events.
            primary_domains = {
                f.agent_name for f in cluster_findings 
                if f.agent_name in ["Authentication Agent", "Endpoint Agent", "Network Monitoring Agent", "Malicious Behaviour Agent"]
            }

            if target_incident is None:
                if len(findings_with_provenance) < 2 or len(distinct_source_events) < 2 or len(primary_domains) < 2:
                    for lone_f in cluster_findings:
                        uncorrelated_findings.append(lone_f.finding_id)
                        if lone_f.incident_id is not None:
                            lone_f.incident_id = None
                            self.db.commit()
                    self.log(
                        "INFO",
                        f"Cluster '{pivot_entity}' remains uncorrelated: insufficient cross-domain corroboration "
                        f"({len(findings_with_provenance)} valid finding(s), {len(distinct_source_events)} event(s), "
                        f"{len(primary_domains)} primary domain(s); threshold requires >= 2 distinct primary detection domains, >= 2 findings, and >= 2 events)."
                    )
                    continue'''

if target in content:
    content = content.replace(target, replacement, 1)
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print('Updated correlation_agent.py')
else:
    print('Target not found in correlation_agent.py')
