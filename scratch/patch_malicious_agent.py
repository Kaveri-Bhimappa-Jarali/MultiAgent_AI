path = 'backend/app/agents/malicious_behaviour_agent.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''        elif has_net and has_proc:
            self.record_finding(
                title="Suspicious Network Ingress Followed by Process Execution",
                severity="HIGH",
                confidence=0.90,
                description="Network activity correlated immediately with script/binary execution on target host, suggesting remote command delivery or dropper invocation.",
                evidence={
                    "event_types": list(event_types),
                    "target_hosts": list(hosts),
                    "host": primary_host,
                    "username": primary_user,
                    "event_ids": event_ids
                },
                recommendations=[
                    "Inspect firewall inbound flow logs",
                    "Audit EDR parent-child process relationship"
                ],
                source_event_ids=event_ids
            )
            composite_findings.append("Network-to-Execution pivot observed")'''

replacement = '''        elif has_net and has_proc:
            # Differentiate routine system activity from genuine adversarial ingress
            has_suspicious_net = any(
                e.severity in ["HIGH", "CRITICAL"] or
                (e.destination_port and e.destination_port in [4444, 1337, 31337, 8888, 6667]) or
                any(k in (e.command_line or "").lower() for k in ["syn flood", "sweep", "scan", "c2", "exploit", "shell", "reverse"])
                for e in events if e.event_type == "network_connection"
            )
            has_suspicious_proc = any(
                e.severity in ["HIGH", "CRITICAL"] or
                any(k in (e.command_line or "").lower() for k in ["powershell", "mimikatz", "sh -i", "bash -i", "nc -e", "chmod 777", "token_elevation", "curl", "wget", "eval", "-enc", "hidden"])
                for e in events if e.event_type == "process_execution"
            )

            if has_suspicious_net or has_suspicious_proc:
                self.record_finding(
                    title="Suspicious Network Ingress Followed by Process Execution",
                    severity="HIGH",
                    confidence=0.90,
                    description="Network activity correlated immediately with script/binary execution on target host, suggesting remote command delivery or dropper invocation.",
                    evidence={
                        "event_types": list(event_types),
                        "target_hosts": list(hosts),
                        "host": primary_host,
                        "username": primary_user,
                        "event_ids": event_ids
                    },
                    recommendations=[
                        "Inspect firewall inbound flow logs",
                        "Audit EDR parent-child process relationship"
                    ],
                    source_event_ids=event_ids
                )
                composite_findings.append("Network-to-Execution pivot observed")'''

if target in content:
    content = content.replace(target, replacement, 1)
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print('Updated malicious_behaviour_agent.py')
else:
    print('Target not found in malicious_behaviour_agent.py')
