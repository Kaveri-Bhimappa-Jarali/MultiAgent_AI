# IMPLEMENTATION ROADMAP: Multi-Agent AI Security Operations Center (SOC)

**Document Version:** 1.0.0  
**Status:** Phased Engineering Roadmap  
**Operating Principle:** Small, testable, incremental milestones. No code modification prior to user review and milestone sign-off.

---

## Roadmap Overview

```
Milestone 1: Transport Resilience & 2-VM Gateway Alignment (P0)
   │
   ▼
Milestone 2: Pipeline Deduplication & Orchestrator Cleanliness (P0/P1)
   │
   ▼
Milestone 3: 2-VM SOAR Containment Execution (BLOCK_IP on Endpoint) (P0)
   │
   ▼
Milestone 4: Purge Frontend Mock Fallbacks & Align Incident Schema (P0)
   │
   ▼
Milestone 5: Correlation Metric Alignment & Real-Time Event Sync (P1)
   │
   ▼
Milestone 6: End-to-End Live Verification with Two-VM Scenarios (P1)
```

---

## Milestone 1: Transport Resilience & 2-VM Topology Verification

### Objective
Ensure that the telemetry pipeline between the two cloud VMs (Attacker `45.74.156.44` and Victim `45.74.156.43`) and the host backend remains continuously connected, automatically recovering if an SSH connection resets.

### Files to Modify
- `scripts/start_vm_tunnels.ps1`: Add loop-based health check that pings remote port 18000 and restarts the background SSH process if dropped.
- `backend/app/services/simulation_service.py`: Verify that SSH timeout fallback gracefully handles Windows selector loops.

### Dependencies
- Cloud VMs accessible via SSH key `C:\Users\VICTUS\.ssh\id_ed25519`.
- Port 8000 listening on local development machine.

### Expected Behaviour
- Remote `soc-agent.service` on Victim VM sends telemetry to `127.0.0.1:18000` without connection refused errors.
- `/api/simulation/status` and `/api/vm/nodes` continuously report `all_ready: true` and `RECEIVING_TELEMETRY`.

### Acceptance Criteria
- `curl http://127.0.0.1:8000/api/simulation/status` returns `"all_ready": true`.
- Both VM nodes report heartbeats $< 30\text{s}$ old in `soc_enterprise.db`.

### Tests Required
- `python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/api/simulation/status').read())"`
- `.\.venv\Scripts\pytest backend/tests/test_virtual_lab.py`

### Risks
- Network latency or cloud provider security group restrictions; mitigated by existing SSH keepalive configuration.

---

## Milestone 2: Pipeline Deduplication & Orchestrator Bug Fix

### Objective
Eliminate duplicate execution logs and duplicate finding records in the multi-agent blackboard engine.

### Files to Modify
- `backend/app/agents/orchestrator.py`: Line 302-303 (remove redundant second `agent_results.append(corr_res)`).
- `backend/app/services/ingestion_service.py`: Verify SHA-256 event fingerprinting to ensure zero duplicate records on repeated log tailing.

### Dependencies
- Milestone 1 completed.

### Expected Behaviour
- `MultiAgentSOCEngine.dispatch_event_driven_pipeline` returns exactly one result object per executing agent.
- Re-ingesting an identical event record increments `duplicates_skipped` and does not re-trigger agent pipeline.

### Acceptance Criteria
- Running `dispatch_event_driven_pipeline` over a 5-event batch returns `agents_executed` count matching unique executing classes.
- No duplicate records created in `agent_executions` or `agent_findings`.

### Tests Required
- `.\.venv\Scripts\pytest backend/tests/test_realtime_pipeline.py`
- `.\.venv\Scripts\pytest backend/tests/test_audit_and_correlation.py`

### Risks
- Low. Pure bug fix.

---

## Milestone 3: 2-VM SOAR Containment Execution (BLOCK_IP on Endpoint)

### Objective
Enable genuine automated and manual SOAR containment in the two-VM lab by adapting the `BLOCK_IP` action to execute directly on the monitored Victim VM (`iptables -I INPUT -s <attacker_ip> -j DROP`), removing the artificial requirement for a 3rd Gateway VM.

### Files to Modify
- `backend/app/services/response_service.py`: In `execute_response_action`, when executing `BLOCK_IP`, if no `GATEWAY` node exists, route the action to the primary `ENDPOINT` node (`vm-endpoint-01`), constructing the `iptables` drop rule for execution on the monitored host.
- `backend/app/models/response.py`: Ensure `ResponseAction` statuses transition cleanly (`PENDING_APPROVAL` $\rightarrow$ `APPROVED` $\rightarrow$ `PENDING_VM_PULL` $\rightarrow$ `EXECUTED` $\rightarrow$ `VERIFIED`).

### Dependencies
- Milestones 1 and 2 completed.
- Victim VM `vm_telemetry_collector.py` pulling `/api/vm/actions/pending`.

### Expected Behaviour
- When an analyst approves a `BLOCK_IP` action targeting the Attacker IP (`10.0.0.19`), a `VMAction` is created for `vm-endpoint-01`.
- The Victim VM pulls the action, executes `iptables -I INPUT -s 10.0.0.19 -j DROP`, and reports success back via `/api/vm/actions/{id}/result`.
- `verification_service.py` records a `VerificationResult` with status `EXECUTED` or `VERIFIED`.

### Acceptance Criteria
- `POST /api/responses/{action_id}/execute` succeeds with HTTP 200 (no 409 Conflict).
- Subsequent packets from `10.0.0.19` are dropped by the kernel on the Victim VM.
- Rollback via `POST /api/responses/{action_id}/allow` executes `iptables -D INPUT -s 10.0.0.19 -j DROP`.

### Tests Required
- `.\.venv\Scripts\pytest backend/tests/test_soar_simulation.py`
- Live containment verification test script on Victim VM.

### Risks
- Accidental lockout of management SSH session; mitigated by explicit SSH port 22 whitelist in iptables rule (`-p tcp --dport 22 -j ACCEPT`).

---

## Milestone 4: Purge Frontend Mock Fallbacks & Align Incident Schema

### Objective
Completely remove all hardcoded mock fallbacks from the React frontend, ensuring every displayed entity, timeline, IP address, and recommendation reflects real backend database records.

### Files to Modify
- `soc-frontend/src/api/incidentMapper.js`:
  - Replace `if (!sourceIp) sourceIp = '198.51.100.23'` with `inc.affected_ips?.[0] || 'Unknown Origin'`.
  - Replace fake analyst `'Sarah Chen (Lead Tier-3)'` with `inc.assigned_analyst || 'Unassigned'`.
  - Replace static `10:42:31` timeline with real chronological events from `inc.events` or `inc.ai_summary.timeline_highlights`.
  - Replace default 4 mock recommendations with actual proposed actions from `inc.response_actions` or `inc.ai_summary.what_remediation_is_recommended`.
- `soc-frontend/src/hooks/useLiveEvents.js`:
  - Remove line 38 hardcoded `correlationId: 'INC-2026-001'`.
- `soc-frontend/src/pages/Incidents.jsx` & `soc-frontend/src/pages/AiAnalysis.jsx`:
  - Remove fallback to `defaultIncidents` from `mockSecurityData.js`. Render clean empty states when database has 0 incidents.

### Dependencies
- Milestones 1–3 completed.

### Expected Behaviour
- If 0 incidents exist, UI renders: *"No correlated incidents recorded. The system is actively monitoring telemetry."*
- When an incident is created from real VM telemetry, the UI displays genuine IPs (`10.0.0.19`, `10.0.0.18`), genuine timestamps, and actual investigation findings.

### Acceptance Criteria
- Searching the frontend bundle for `198.51.100.23` or `Sarah Chen` yields zero active runtime usages.
- Full UI inspection on `/incidents`, `/events`, and `/ai-analysis` shows authentic data exclusively.

### Tests Required
- Frontend build test (`cd soc-frontend && npm run build`).
- UI inspection across all routes.

### Risks
- Minor styling adjustments for empty states; low technical risk.

---

## Milestone 5: Correlation Metric Alignment & Real-Time Sync

### Objective
Align dashboard KPI calculations with strict SOC definitions, distinguishing between raw events, individual findings, correlated events, and incidents.

### Files to Modify
- `soc-frontend/src/pages/Dashboard.jsx`:
  - Update `correlatedCount` calculation to sum contributing event counts across active incidents rather than equating it to total incident count (`const correlatedCount = incidentList.reduce((sum, i) => sum + (i.event_count || 0), 0)`).
  - Remove hardcoded `miniSparklines` import; derive trends from `event_trends` API response.
- `soc-frontend/src/pages/Correlation.jsx`:
  - Add WebSocket subscription to `INCIDENT_CREATED` and `INCIDENT_UPDATED` to refresh the correlation graph in real-time.

### Dependencies
- Milestone 4 completed.

### Expected Behaviour
- Dashboard metric card *Correlated Events* accurately displays the total number of security events linked into multi-signal incidents.
- Live correlation view updates immediately when a new attack scenario triggers correlation.

### Acceptance Criteria
- If an incident contains 8 contributing events, *Correlated Events* increases by 8 (not 1).
- WebSocket broadcasts update the correlation graph without requiring manual page reload.

### Tests Required
- `.\.venv\Scripts\pytest backend/tests/test_analytics_and_health.py`
- UI verification on `/dashboard` and `/correlation`.

### Risks
- None. Standardizes frontend telemetry presentation.

---

## Milestone 6: End-to-End Live Laboratory Verification

### Objective
Execute the 10 canonical test scenarios defined in Part 9 of the Master Directive using the live two-VM cloud laboratory.

### Scenarios to Verify
1. **Scenario 1 (No attack activity)**: Normal heartbeat telemetry; 0 false incidents; health green.
2. **Scenario 2 (Single reconnaissance probe)**: Single Nmap port scan; individual finding generated; **0 multi-event incidents created** (strictly verifies correlation gate).
3. **Scenario 3 (Multiple authentication failures)**: Failed SSH password attempts from Attacker VM; `AuthenticationAgent` creates brute-force finding.
4. **Scenario 4 (Multi-stage attack sequence)**: Reconnaissance followed by brute-force and sudo escalation; `CorrelationAgent` groups evidence into 1 correlated incident with 8-question RCA and DAG attack-path.
5. **Scenario 5 (Unrelated events)**: Distinct events from different entities remain independent.
6. **Scenario 6 (Duplicate telemetry)**: Re-sent logs correctly deduplicated (`duplicates_skipped` increments).
7. **Scenario 7 (Existing incident update)**: Follow-up activity from same threat actor updates existing incident rather than spawning duplicate incident.
8. **Scenario 8 (Investigation report)**: `Incident.ai_summary` accurately reflects chronological evidence and observed MITRE techniques.
9. **Scenario 9 (Response execution & verification)**: Analyst approves `BLOCK_IP`; Victim VM executes iptables drop; subsequent traffic blocked and verified.
10. **Scenario 10 (Telemetry interruption)**: Simulated tunnel drop marks node `STALE` without fabricating threat cessation.

### Deliverables
- `E2E_VERIFICATION_REPORT.md` documenting actual execution logs, API responses, timestamps, and screenshots/evidence from the live two-VM environment.
