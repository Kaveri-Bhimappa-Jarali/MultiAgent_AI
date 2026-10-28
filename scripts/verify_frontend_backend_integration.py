#!/usr/bin/env python3
"""
scripts/verify_frontend_backend_integration.py
End-to-end verification of all backend REST endpoints and WebSocket channels
exercised by the React TypeScript frontend.
"""
import sys
import os
import json
import time

sys.stdout.reconfigure(line_buffering=True)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from starlette.testclient import TestClient
from app.main import app

def run_integration_verification():
    print("=" * 70)
    print("FRONTEND - BACKEND INTEGRATION & API ACCEPTANCE TEST")
    print("=" * 70)
    
    results = {}
    client = TestClient(app)

    # 1. Test Authentication Login
    print("\n[1] Testing Authentication: POST /api/auth/login")
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "Admin@SOC2026!"})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token_data = login_res.json()
    assert "access_token" in token_data, "No access_token returned"
    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"    -> Status: {login_res.status_code} OK, Token: {token[:20]}..., User: {token_data.get('user', {}).get('username')}")
    results["auth_login"] = "PASS"

    # 2. Test Current User: GET /api/auth/me
    print("\n[2] Testing Current User: GET /api/auth/me")
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    user_info = me_res.json()
    assert user_info["username"] == "admin"
    print(f"    -> Status: {me_res.status_code} OK, Role: {user_info.get('role')}")
    results["auth_me"] = "PASS"

    # 3. Test Dashboard Summary: GET /api/dashboard/summary
    print("\n[3] Testing Dashboard Summary: GET /api/dashboard/summary")
    dash_res = client.get("/api/dashboard/summary", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    print(f"    -> Status: {dash_res.status_code} OK")
    print(f"       Total Events: {dash_data.get('total_events', 0)}")
    print(f"       Active Incidents: {dash_data.get('active_incidents', 0)}")
    print(f"       System Health: {dash_data.get('system_health', 'UNKNOWN')}")
    results["dashboard_summary"] = "PASS"

    # 4. Test Events Listing: GET /api/events
    print("\n[4] Testing Events: GET /api/events?limit=10")
    evt_res = client.get("/api/events?limit=10", headers=headers)
    assert evt_res.status_code == 200
    evt_data = evt_res.json()
    print(f"    -> Status: {evt_res.status_code} OK, Returned {len(evt_data.get('events', []))} events")
    results["events_list"] = "PASS"

    # 5. Test Live Event Ingestion: POST /api/events/ingest
    print("\n[5] Testing Event Ingestion: POST /api/events/ingest")
    test_payload = {
        "source": "host_agent",
        "event_type": "failed_login",
        "source_ip": "198.51.100.99",
        "destination_ip": "10.0.0.1",
        "source_user": "acceptance.tester",
        "severity": "HIGH",
        "action": "blocked",
        "details": {"reason": "Integration verification payload", "port": 22}
    }
    ingest_res = client.post("/api/events/ingest", json=test_payload, headers=headers)
    assert ingest_res.status_code in (200, 201), f"Ingest failed: {ingest_res.text}"
    ingest_data = ingest_res.json()
    print(f"    -> Status: {ingest_res.status_code} OK, Ingested Event ID: {ingest_data.get('id') or ingest_data.get('event_id')}")
    results["events_ingest"] = "PASS"

    # 6. Test Detection Rules: GET /api/detections/rules
    print("\n[6] Testing Detection Rules: GET /api/detections/rules")
    rules_res = client.get("/api/detections/rules", headers=headers)
    assert rules_res.status_code == 200
    rules = rules_res.json()
    assert len(rules) >= 4, f"Expected seeded rules, got {len(rules)}"
    print(f"    -> Status: {rules_res.status_code} OK, Active rules count: {len(rules)}")
    for r in rules[:3]:
        print(f"       Rule [{r.get('rule_id')}]: {r.get('name')} (Severity: {r.get('severity')})")
    results["detection_rules"] = "PASS"

    # 7. Test Agents Status: GET /api/agents/status
    print("\n[7] Testing Agents Status: GET /api/agents/status")
    agents_res = client.get("/api/agents/status", headers=headers)
    assert agents_res.status_code == 200
    agents = agents_res.json()
    assert len(agents) >= 10, f"Expected 10 agents, found {len(agents)}"
    print(f"    -> Status: {agents_res.status_code} OK, Total Agents: {len(agents)}")
    for a in agents:
        print(f"       Agent: {a.get('name'):<28} Status: {a.get('status'):<8} Mode: {a.get('mode', 'ACTIVE')}")
    results["agents_status"] = "PASS"

    # 8. Test Incidents: GET /api/incidents
    print("\n[8] Testing Incidents: GET /api/incidents")
    inc_res = client.get("/api/incidents", headers=headers)
    assert inc_res.status_code == 200
    incidents = inc_res.json()
    print(f"    -> Status: {inc_res.status_code} OK, Total Incidents: {len(incidents)}")
    if incidents:
        top = incidents[0]
        print(f"       Latest Incident: {top.get('incident_id')} - {top.get('title')} (Risk: {top.get('risk_score')})")
    results["incidents_list"] = "PASS"

    # 9. Test Responses: GET /api/responses
    print("\n[9] Testing SOAR Responses: GET /api/responses")
    resp_res = client.get("/api/responses", headers=headers)
    assert resp_res.status_code == 200
    responses = resp_res.json()
    print(f"    -> Status: {resp_res.status_code} OK, Response Actions: {len(responses)}")
    results["responses_list"] = "PASS"

    # 10. Test Threat Intelligence Indicators: GET /api/intelligence/indicators
    print("\n[10] Testing Threat Intel: GET /api/intelligence/indicators")
    intel_res = client.get("/api/intelligence/indicators", headers=headers)
    assert intel_res.status_code == 200
    indicators = intel_res.json()
    print(f"    -> Status: {intel_res.status_code} OK, Indicators: {len(indicators)}")
    results["threat_intel"] = "PASS"

    # 11. Test VM Nodes & Diagnostics: GET /api/vm/nodes and GET /api/vm/diagnostics
    print("\n[11] Testing Virtual Enterprise Lab API: GET /api/vm/nodes & GET /api/vm/diagnostics")
    vm_res = client.get("/api/vm/nodes", headers=headers)
    assert vm_res.status_code == 200
    vm_data = vm_res.json()
    vm_nodes = vm_data.get("nodes", [])
    print(f"    -> Status: {vm_res.status_code} OK, Seeded VM Nodes: {len(vm_nodes)}")
    for node in vm_nodes:
        print(f"       VM Node: {node.get('name')} ({node.get('role')}) IP: {node.get('ip_address')}")
    
    diag_res = client.get("/api/vm/diagnostics", headers=headers)
    assert diag_res.status_code == 200
    diag = diag_res.json()
    print(f"    -> Diagnostics: Hypervisor Installed: {diag.get('hypervisor_installed')} ({diag.get('hypervisor_type')})")
    print(f"       Environment Status: {diag.get('environment_status')}")
    results["vm_lab_api"] = "PASS"

    # 12. Test WebSocket Global Channel: /api/ws
    print("\n[12] Testing Global WebSocket Channel: /api/ws", flush=True)
    with client.websocket_connect("/api/ws") as websocket:
        # First message received on connect is INITIAL_SYNC
        initial_msg = websocket.receive_json()
        assert initial_msg.get("type") == "INITIAL_SYNC", f"Expected INITIAL_SYNC, got {initial_msg}"
        print(f"    -> WebSocket Handshake OK! Received INITIAL_SYNC. Buffer count: {len(initial_msg.get('data', {}).get('recent_events', []))}", flush=True)

        # Send ping and verify pong
        websocket.send_text("ping")
        reply = websocket.receive_text()
        assert reply == "pong", f"Expected 'pong', got '{reply}'"
        print(f"    -> WebSocket Ping/Pong OK: 'ping' -> '{reply}'", flush=True)

    results["websocket_channel"] = "PASS"

    print("\n" + "=" * 70)
    print("INTEGRATION VERIFICATION SUMMARY:")
    all_passed = True
    for test, res in results.items():
        print(f"  {test:<28}: {res}")
        if res != "PASS":
            all_passed = False
    print("=" * 70)
    if all_passed:
        print("ALL 12 FRONTEND-BACKEND INTEGRATION TESTS PASSED PERFECTLY!")
    else:
        print("SOME INTEGRATION TESTS FAILED.")
        sys.exit(1)

if __name__ == "__main__":
    run_integration_verification()
