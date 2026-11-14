import json
import sys
import os

# Set pythonpath to include backend
sys.path.insert(0, os.path.abspath("backend"))

from fastapi.testclient import TestClient
from app.main import app

def verify_initial_state():
    client = TestClient(app)

    print("--- Checking Initial Dashboard Summary ---")
    resp = client.get("/api/dashboard/summary")
    assert resp.status_code == 200, f"Dashboard summary failed: {resp.status_code} {resp.text}"
    summary = resp.json()
    metrics = summary.get("metrics", {})

    print("Dashboard Summary Metrics:")
    for k, v in metrics.items():
        print(f"  {k}: {v}")

    print("\n--- Checking Incidents API ---")
    resp_inc = client.get("/api/incidents")
    assert resp_inc.status_code == 200
    incidents = resp_inc.json()
    print(f"  Total incidents: {len(incidents)}")

    print("\n--- Checking Responses API ---")
    resp_actions = client.get("/api/responses")
    assert resp_actions.status_code == 200
    responses = resp_actions.json()
    print(f"  Total responses: {len(responses)}")

    print("\n--- Checking Events API ---")
    resp_events = client.get("/api/events")
    assert resp_events.status_code == 200
    events_data = resp_events.json()
    events_list = events_data.get("events", []) if isinstance(events_data, dict) else events_data
    print(f"  Total events: {len(events_list)}")

    print("\n--- Checking Agent Findings API ---")
    resp_findings = client.get("/api/agents/findings")
    assert resp_findings.status_code == 200
    findings = resp_findings.json()
    print(f"  Total findings: {len(findings)}")

    print("\n--- Checking Agent Status API ---")
    resp_agent_status = client.get("/api/agents/status")
    assert resp_agent_status.status_code == 200
    statuses = resp_agent_status.json()
    total_agent_findings = sum(s.get("total_findings", 0) for s in statuses)
    print(f"  Total agent findings across all agents: {total_agent_findings}")

    # Expected checks:
    checks = {
        "Telemetry Events": metrics.get("total_events", 0) == 0,
        "Agent Findings": len(findings) == 0 and total_agent_findings == 0,
        "Correlated Incidents": len(incidents) == 0,
        "Pending Approvals": metrics.get("actions_pending_approval", 0) == 0,
        "Contained Threats": metrics.get("contained_threats", 0) == 0,
        "Open Incidents": metrics.get("open_incidents", 0) == 0,
    }

    all_passed = True
    print("\n--- Initial State Verification Table ---")
    print(f"{'Metric':<25} | {'Expected':<10} | {'Actual':<10} | {'Status'}")
    print("-" * 60)
    for m, ok in checks.items():
        actual_val = 0 if ok else "NON-ZERO"
        status_str = "PASS" if ok else "FAIL"
        print(f"{m:<25} | {0:<10} | {actual_val:<10} | {status_str}")
        if not ok:
            all_passed = False

    if all_passed:
        print("\nAll initial state metrics are strictly ZERO. Database is clean and ready.")
    else:
        print("\nError: Non-zero metrics found!")
        sys.exit(1)

if __name__ == "__main__":
    verify_initial_state()
