import sys
import time
import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:8000/api"

def http_req(url, method="GET", headers=None, data=None):
    if headers is None:
        headers = {}
    encoded_data = None
    if data is not None:
        encoded_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            parsed = json.loads(content)
        except Exception:
            parsed = {"error": content}
        return e.code, parsed
    except Exception as e:
        return 500, {"error": str(e)}

def main():
    print("=" * 60)
    print("  MULTI-AGENT AI SOC - END-TO-END LIVE TWO-VM TEST")
    print("=" * 60)

    # 1. Login
    print("\n[Step 1] Authenticating with SOC backend...")
    status, login_data = http_req(
        f"{BASE_URL}/auth/login",
        method="POST",
        data={"username": "analyst", "password": "Analyst@SOC2026!"}
    )
    if status != 200:
        print(f"FAILED to login: {status} {login_data}")
        sys.exit(1)

    token = login_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(" Authenticated successfully.")

    # 2. Check VM Diagnostics and Connectivity
    print("\n[Step 2] Checking Two-VM Laboratory connectivity...")
    status, status_data = http_req(f"{BASE_URL}/simulation/status", headers=headers)
    if status != 200:
        print(f"FAILED status: {status} {status_data}")
        sys.exit(1)
    print(f" Attacker VM ({status_data['attacker_vm']['host']}): Reachable={status_data['attacker_vm']['is_reachable']}")
    print(f" Victim VM ({status_data['victim_vm']['host']}): Reachable={status_data['victim_vm']['is_reachable']}")
    print(f" Private Network Reachability: {status_data['private_network_reachability']} (Latency: {status_data.get('private_latency_ms')}ms)")
    print(f" All Ready: {status_data['all_ready']}")

    if not status_data["all_ready"]:
        print("ERROR: Infrastructure not ready.")
        sys.exit(1)

    # 3. Launch recon_port_scan attack simulation
    print("\n[Step 3] Launching 'recon_port_scan' attack simulation from Attacker VM...")
    status, execution = http_req(
        f"{BASE_URL}/simulation/launch",
        method="POST",
        headers=headers,
        data={
            "scenario_id": "recon_port_scan",
            "target_ip": "10.0.0.18",
            "parameters": {"ports": "21,22,80,443", "max_rate": 50}
        }
    )
    if status not in (200, 201):
        print(f"FAILED to launch simulation: {status} {execution}")
        sys.exit(1)

    exec_id = execution["execution_id"]
    print(f" Attack simulation launched: Execution ID = {exec_id}")
    print(f" Command dispatched to Attacker VM: {execution.get('command_executed')}")

    # 4. Poll execution until completion
    print("\n[Step 4] Monitoring attack execution on Attacker VM...")
    completed = False
    for attempt in range(25):
        time.sleep(3)
        status, data = http_req(f"{BASE_URL}/simulation/executions/{exec_id}", headers=headers)
        if status == 200:
            curr_status = data.get("status")
            print(f"  [{attempt * 3}s] Status: {curr_status} | Alert Status: {data.get('soc_alert_status')}")
            if curr_status in ["COMPLETED", "FAILED", "ERROR"]:
                completed = True
                print(f" Attack execution finished with status: {curr_status}")
                print(f" Attack log output preview:\n{data.get('output_log', '')[:400]}")
                break

    if not completed:
        print("WARNING: Simulation did not complete within 75s.")

    # 5. Allow telemetry ingestion and agent pipeline to complete
    print("\n[Step 5] Awaiting telemetry ingestion & 10-Agent Pipeline execution (10s)...")
    time.sleep(10)

    # 6. Check Ingested Events
    status, events_data = http_req(f"{BASE_URL}/events?limit=20", headers=headers)
    events = events_data.get("events", []) if status == 200 else []
    print(f"\n[Step 6] Total recent events in database: {len(events)}")
    for ev in events[:5]:
        print(f"  - [{ev.get('timestamp')}] {ev.get('event_type')} | Src: {ev.get('source_ip')} -> Dst: {ev.get('destination_ip')} | Sev: {ev.get('severity')}")

    # 7. Check Detection Findings
    status, findings = http_req(f"{BASE_URL}/detections", headers=headers)
    findings = findings if status == 200 and isinstance(findings, list) else []
    print(f"\n[Step 7] Detection Findings recorded: {len(findings)}")
    for f in findings[:5]:
        print(f"  - [{f.get('severity')}] {f.get('rule_name') or f.get('title')} (Score: {f.get('anomaly_score')})")

    # 8. Check Agent Executions and Findings
    print("\n[Step 8] Checking Multi-Agent Pipeline Status...")
    status, agents = http_req(f"{BASE_URL}/agents/status", headers=headers)
    if status == 200 and isinstance(agents, list):
        print(f" Agents reporting: {len(agents)}")
        for a in agents:
            print(f"  - {a.get('name')}: Status={a.get('status')} | Total Runs={a.get('total_runs')} | Total Findings={a.get('total_findings')}")

    # 9. Check Correlated Incidents
    print("\n[Step 9] Checking Correlated Incidents...")
    status, incidents = http_req(f"{BASE_URL}/incidents", headers=headers)
    incidents = incidents if status == 200 and isinstance(incidents, list) else []
    print(f" Incidents in database: {len(incidents)}")
    for inc in incidents:
        print(f"\n  === Incident: {inc.get('incident_id')} ===")
        print(f"  Title: {inc.get('title')}")
        print(f"  Severity: {inc.get('severity')} | Risk Score: {inc.get('risk_score')}")
        print(f"  Affected Hosts: {inc.get('affected_hosts')}")
        print(f"  Affected IPs: {inc.get('affected_ips')}")
        print(f"  Event Count: {inc.get('event_count')}")
        print(f"  Assigned Analyst: {inc.get('assigned_analyst')}")
        if inc.get("ai_summary"):
            summary = inc["ai_summary"]
            print(f"  [AI Summary - What Happened]: {summary.get('what_happened')}")
            print(f"  [AI Summary - Observed Techniques]: {summary.get('which_techniques_were_observed')}")
            print(f"  [AI Summary - Recommended Remediation]: {summary.get('what_remediation_is_recommended')}")

    # 10. Check SOAR Response Actions
    print("\n[Step 10] Checking SOAR Response Actions formulated...")
    status, responses = http_req(f"{BASE_URL}/responses", headers=headers)
    responses = responses if status == 200 and isinstance(responses, list) else []
    print(f" Proposed Response Actions: {len(responses)}")
    for r in responses:
        print(f"  - [{r.get('status')}] {r.get('action_type')} on {r.get('target_value')} (Incident: {r.get('incident_id')})")

    print("\n" + "=" * 60)
    print("  VERIFICATION SCRIPT COMPLETED")
    print("=" * 60)

if __name__ == "__main__":
    main()
