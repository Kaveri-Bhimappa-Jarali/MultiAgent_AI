# PROJECT AUDIT: Multi-Agent AI Security Operations Center (SOC)

**Document Version:** 1.0.0  
**Audit Date:** November 15, 2026  
**Auditor:** Senior Software Architect & Cybersecurity Lead  
**Operating Branch:** `Isha` / `Kaveri`  
**Automated Test Suite Status:** 100/100 tests passed (`.\.venv\Scripts\pytest backend/tests/`)  

---

## 1. Actual System Architecture

The project consists of a hybrid multi-tier architecture deployed across local developer infrastructure and two dedicated cloud virtual machines:

```
[Attacker VM: 45.74.156.44 / 10.0.0.19]
      │
      │ Controlled Adversary Emulation (Nmap, SSH probes, HTTP requests)
      ▼
[Victim VM: 45.74.156.43 / 10.0.0.18]
      │
      │ Guest Telemetry Collector (vm_telemetry_collector.py)
      │ Captures: auth.log, nginx access.log, AF_PACKET TCP/UDP, sudo audit
      ▼
[SSH Reverse Tunnel: 127.0.0.1:18000 -> 127.0.0.1:8000]
      ▼
[SOC Backend: FastAPI (Python 3.12, Uvicorn on 127.0.0.1:8000)]
      ├── Ingestion Subsystem (`/api/vm/telemetry`, `/api/events`)
      ├── Asynchronous In-Memory Ring Queue (`RealtimeEventQueue`)
      ├── Rolling-Window Rule Detection (`evaluate_event_with_rolling_window`)
      ├── Multi-Agent Blackboard Engine (`MultiAgentSOCEngine`)
      │     ├── Stage 1: Domain Ingestion Agents (Network, Auth, Endpoint)
      │     ├── Stage 2: Intelligence Agents (ML Anomaly, Malicious Behaviour, Threat Intel)
      │     ├── Stage 3: Spatial-Temporal Correlation (`CorrelationAgent`)
      │     └── Stage 4: Downstream Synthesis (Attack Path, Investigation, Response)
      ├── SQLite Database (`soc_enterprise.db` via SQLAlchemy ORM)
      └── WebSocket Broadcaster (`broadcaster.py` fan-out to clients)
      ▲
      │ REST API & WebSocket Feed
[SOC Frontend: React 18 + Vite (Tailwind CSS on http://localhost:5173)]
```

---

## 2. Actual Execution Flow

Tracing an authentic security signal from generation to visualization:

1. **Adversary Emulation**: Attacker VM (`45.74.156.44`) initiates network probes or SSH credential tests against Victim VM private IP (`10.0.0.18`).
2. **Telemetry Collection**: `virtual-lab/guest-agent/vm_telemetry_collector.py` (running as systemd service `soc-agent` on Victim VM) tails `/var/log/auth.log`, `/var/log/nginx/access.log`, and captures raw socket connections via Linux `AF_PACKET`.
3. **Transport**: The collector batches telemetry and sends HTTP `POST` requests to `http://127.0.0.1:18000/api/vm/telemetry`. An SSH reverse tunnel forwards this traffic to local port `8000`.
4. **Ingestion & Deduplication**:
   - `backend/app/api/virtual_lab.py:submit_vm_telemetry` verifies `X-VM-Key`.
   - `backend/app/services/vm_service.py:ingest_vm_telemetry` maps payload into `SecurityEventCreate` instances (`is_simulated=False`).
   - `backend/app/services/ingestion_service.py:normalize_and_ingest_events` computes a SHA-256 fingerprint (`generate_event_id`), rejects duplicates, commits records to `security_events` table, and pushes `event_id` into `RealtimeEventQueue`.
5. **Real-time Queue Processing**:
   - `backend/app/services/event_queue.py:_worker_loop` pops `event_id` in background asyncio task.
   - Calls `evaluate_event_with_rolling_window` to evaluate deterministic MITRE detection rules.
   - Invokes `MultiAgentSOCEngine.dispatch_event_driven_pipeline`.
6. **Agent Blackboard Execution**:
   - Stage 1 triggers domain agents (`AuthenticationAgent`, `NetworkMonitoringAgent`, `EndpointAgent`) based on event type.
   - Stage 2 triggers `AnomalyDetectionAgent` (7-feature Isolation Forest), `MaliciousBehaviourAgent` (kill-chain heuristic), and `ThreatIntelligenceAgent` (CTI indicator lookup).
   - Findings are persisted as `AgentFinding` rows in `agent_findings`.
   - Stage 3 invokes `CorrelationAgent`: checks if $\ge 2$ distinct events and $\ge 2$ findings exist within the 900s operational window. If criteria are met, an `Incident` is created/updated.
   - Stage 4 invokes downstream agents on established incidents:
     - `AttackPathAgent`: Builds DAG JSON structure (`nodes`, `edges`).
     - `InvestigationAgent`: Synthesizes 8 canonical SOC root cause answers.
     - `ResponseAgent`: Formulates `ResponseAction` proposals (`BLOCK_IP`, `ISOLATE_HOST`).
7. **Broadcast & Dashboard Display**:
   - Events, findings, incidents, and agent status changes are broadcast via `broadcaster.publish_sync` over WebSocket (`/api/ws/events`).
   - React frontend receives payloads, updating UI in real-time.

---

## 3. Agent-by-Agent Implementation Audit

| Agent Name | Source File & Class | Status | Inputs & Dependencies | Outputs & Persisted State | Verified Discrepancies & Gaps |
|---|---|---|---|---|---|
| **Agent 1: Network Monitoring Agent** | `backend/app/agents/network_agent.py`<br>`NetworkMonitoringAgent` | **IMPLEMENTED AND VERIFIED** | Context `events` (types: `network_connection`, `network_traffic`, `network`).<br>Supervised ML flow inference via `dataset_pipeline.py`. | Appends findings to `agent_findings` (Port Sweeps, C2 Beaconing, ML Flow classifications). | Works as designed for port sweeps ($\ge 3$ ports) and C2 indicator matches. However, relies primarily on high-level connection records rather than raw bidirectional flow metrics (duration, forward/backward packet counts). |
| **Agent 2: Authentication Agent** | `backend/app/agents/auth_agent.py`<br>`AuthenticationAgent` | **IMPLEMENTED AND VERIFIED** | Context `events` (type: `authentication`). Rolling login attempts cache. | `AgentFinding` records (Brute-Force Spray, Account Takeover, Failed Logins). | Accurately groups failed authentications by IP ($\ge 3$) and flags failure-followed-by-success. Successfully tested on authentic syslog from Victim VM. |
| **Agent 3: Endpoint Agent** | `backend/app/agents/endpoint_agent.py`<br>`EndpointAgent` | **IMPLEMENTED AND VERIFIED** | Context `events` (types: `process_execution`, `file_access`, `privilege_escalation`). | `AgentFinding` records (Shadow Copy deletion T1490, encoded PowerShell, sudo privilege escalation). | Evaluates command lines and file paths. Does not currently inspect full Linux auditd parent/child process trees because auditd rules are not actively streaming tree lineages from the guest. |
| **Agent 4: Anomaly Detection Agent** | `backend/app/agents/anomaly_detection_agent.py`<br>`AnomalyDetectionAgent` | **IMPLEMENTED AND VERIFIED** | Context `events`.<br>Model: `backend/app/data/event_isolation_forest.joblib` (7 features). | `AgentFinding` records (Statistical Behavioral Outlier, Multi-Port Recon Anomaly). | Uses 7 numerical features: `[port, is_priv, hour, off_hours, cmd_len, is_failed, sev_weight]`. Flags statistical divergence when anomaly score $\ge 60.0$. |
| **Agent 5: Malicious Behaviour Agent** | `backend/app/agents/malicious_behaviour_agent.py`<br>`MaliciousBehaviourAgent` | **IMPLEMENTED AND VERIFIED** | Aggregated `events` across domains (`authentication`, `privilege_escalation`, `file_access`). | `AgentFinding` records for composite attack chains. | Accurately identifies multi-stage sequences (e.g. Ingress $\rightarrow$ Privilege Escalation $\rightarrow$ Data Staging) without duplicating Correlation Agent clustering. |
| **Agent 6: Threat Intelligence Agent** | `backend/app/agents/threat_intel_agent.py`<br>`ThreatIntelligenceAgent` | **IMPLEMENTED AND VERIFIED** | Extracted IPs, domains, and SHA-256 hashes from event payloads.<br>Service: `threat_intel_service.py`. | `AgentFinding` records with reputation score, threat actor, and tags. | Extracts SHA-256 via regex and checks against curated database. Matches against `threat_indicators` SQLite table. Does not query live third-party APIs (AbuseIPDB/OTX) directly; relies on local curated cache. |
| **Agent 7: Correlation Agent** | `backend/app/agents/correlation_agent.py`<br>`CorrelationAgent` | **IMPLEMENTED AND VERIFIED** | Persisted `AgentFinding` rows in correlation window ($300\text{s} - 900\text{s}$). Fallback to context `events`. | `Incident` creation, `IncidentEvent` links, `IncidentFinding` links. | **Enforces strict criteria**: Requires $\ge 2$ findings with provenance and $\ge 2$ distinct source events. Unrelated or single-event probes are correctly left uncorrelated. Existing incidents are updated without ID mutation or duplicate relationship links. |
| **Agent 8: Attack-Path Analysis Agent** | `backend/app/agents/attack_path_agent.py`<br>`AttackPathAgent` | **IMPLEMENTED AND VERIFIED** | `IncidentEvent` records linked to established incident. | Populates `Incident.attack_path_json` with DAG nodes (`source_ip`, `account`, `endpoint`, `server`, `resource`) and edges. | Generates structured directed graph JSON. Edge labels reflect chronological progression (`authenticates_via`, `controls_session`, `accesses_resource`). |
| **Agent 9: Investigation Agent** | `backend/app/agents/investigation_agent.py`<br>`InvestigationAgent` | **IMPLEMENTED AND VERIFIED** | Incident context, linked events, and correlated detection findings. | Populates `Incident.ai_summary` with answers to the **8 Canonical SOC Questions**. | Produces genuine evidence-based root cause analysis without hallucinated techniques. Correctly computes chronological window and affected entities. |
| **Agent 10: Response Agent** | `backend/app/agents/response_agent.py`<br>`ResponseAgent` | **PARTIALLY IMPLEMENTED / BROKEN FOR IP BLOCK** | Incident risk score, affected entities (`affected_ips`, `affected_users`, `affected_hosts`). | `ResponseAction` records (`BLOCK_IP`, `DISABLE_USER`, `ISOLATE_HOST`) in `PENDING_APPROVAL` or `RECOMMENDED`. | **Defect Identified**: `response_service.py:execute_response_action` requires a node with `role == 'GATEWAY'` to execute `BLOCK_IP` (lines 136-141). Since the 2-VM lab has only `ENDPOINT` and `ATTACKER`, executing `BLOCK_IP` raises HTTP 409! `DISABLE_USER` raises HTTP 501. `ISOLATE_HOST` works via `VMAction`. |

---

## 4. Telemetry Collection & VM Infrastructure Audit

### Attacker VM (`45.74.156.44 / 10.0.0.19`)
- **Status**: **IMPLEMENTED AND VERIFIED**
- **Capabilities**: Python 3, Nmap, Curl, Netcat all installed and verified.
- **Role**: Emulates controlled adversarial activity (SSH credential probes, port sweeps, HTTP resource probes).
- **Control Mechanism**: Orchestrated remotely via `simulation_service.py` over SSH.

### Victim VM (`45.74.156.43 / 10.0.0.18`)
- **Status**: **IMPLEMENTED AND VERIFIED**
- **Agent Daemon**: `virtual-lab/guest-agent/vm_telemetry_collector.py` running under systemd (`soc-agent.service`).
- **Data Collected**:
  - `auth.log`: Captures SSH failed passwords, invalid users, successful logins, and sudo executions.
  - `nginx/access.log`: Captures HTTP web access, status codes (401, 403, 404), URI probes.
  - `AF_PACKET`: Raw socket listener capturing inbound TCP SYN and UDP packets directly on `eth0`.
  - Offline Buffer: Maintains `.offline_buffer_vm-endpoint-01.json` when disconnected and flushes upon reconnection.
- **SOAR Execution**: Pulls `GET /api/vm/actions/pending` every 5 seconds; executes `iptables` rules when dispatched.

### Tunnel Architecture
- **Status**: **IMPLEMENTED BUT FRAGILE**
- **Configuration**: Reverse SSH tunnel (`127.0.0.1:18000 -> 127.0.0.1:8000`) on both VMs.
- **Vulnerability**: If the development host restarts or the SSH connection resets, the tunnel dies, causing guest telemetry to buffer offline and dashboard node status to turn `STALE`.

---

## 5. API & Database Integrity Audit

### Database Schema (`soc_enterprise.db`)
- 21 tables managed via SQLAlchemy ORM.
- Foreign keys enabled (`PRAGMA foreign_keys = ON`).
- Unique constraints in place:
  - `incident_events`: `UniqueConstraint('incident_id', 'event_id', name='uq_incident_event')` prevents duplicate event links.
  - `incident_findings`: `UniqueConstraint('incident_id', 'finding_id', name='uq_incident_finding')` prevents duplicate finding links.
- UTC timestamp normalization enforced across all models via `UTCDateTime` custom TypeDecorator.

### Database Deficiencies Identified
1. **Redundant Server Node**: `vm_nodes` contains `vm-server-01` (`192.168.56.15`), a leftover template from VirtualBox days. It has `last_heartbeat_at = None`.
2. **Missing Gateway Node Definition**: Response policy expects a gateway for perimeter firewall actions, but the lab has no gateway VM node.

---

## 6. Frontend Dashboard Audit

### Clean & Functional Pages
- `/events`: Fully live. Renders authentic security events streamed from `/api/events` and WebSocket.
- `/correlation`: Fully live. Renders real incident clusters, linked events, and correlation reasons.
- `/agents`: Fully live. Renders real agent execution metrics, status, logs, and findings from `/api/agents/status`.
- `/simulation`: Fully live. Emulation console with real SSH connectivity status and log streaming.
- `/responses`: Functional approval desk. Dry-run and simulation paths verified.

### Misleading Mock Fallbacks Identified in Frontend
1. **Hardcoded Mock Fallbacks in `soc-frontend/src/api/incidentMapper.js`**:
   - Line 22: `if (!sourceIp) sourceIp = '198.51.100.23'` (injects fake IP if backend property name does not match).
   - Line 30: Injects 4 hardcoded recommended actions if `response_actions` array is empty.
   - Line 54: `assignedAnalyst: inc.assigned_analyst || 'Sarah Chen (Lead Tier-3)'`.
   - Line 68: Hardcoded static timeline with fake timestamps (`10:42:31`, `10:43:02`).
2. **Mock Fallback in `soc-frontend/src/hooks/useLiveEvents.js`**:
   - Line 38: `correlationId: e.correlation_id || (e.severity === 'CRITICAL' || e.severity === 'HIGH' ? 'INC-2026-001' : null)`. Fabricates `INC-2026-001` on uncorrelated events!
3. **Metric Conflation in `soc-frontend/src/pages/Dashboard.jsx`**:
   - Line 62: `const correlatedCount = totalIncidents` equates correlated events with incident count instead of summing unique contributing events.
   - Line 4: Imports `miniSparklines` from `mockSecurityData`.
4. **Mock Data Fallbacks on Empty Arrays**:
   - `Incidents.jsx` and `AiAnalysis.jsx`: If `/api/incidents` returns an error, they fall back to `defaultIncidents` from `mockSecurityData.js` instead of displaying an authentic empty state or error alert.

---

## 7. Bug & Reliability Summary

1. **Duplicate Append Bug**: `backend/app/agents/orchestrator.py:302-303` appends `corr_res` twice to `agent_results`.
2. **`BLOCK_IP` Failure**: `backend/app/services/response_service.py:136` rejects IP blocking with HTTP 409 on a 2-VM lab due to lack of a `GATEWAY` node.
3. **Frontend Property Mismatches**: `IncidentResponse` properties (`affected_ips`, `ai_summary`, `title`) do not match what `incidentMapper.js` looks for (`source_ip`, `agent_analysis`, `threat_name`), causing mock fallbacks to trigger.
4. **Tunnel Resilience**: Reverse SSH tunnels require continuous background supervisor script to recover from network disconnects.
