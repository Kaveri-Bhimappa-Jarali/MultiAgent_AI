# Multi-Agent AI Security Operations Center (SOC) for Real-Time Threat Detection

**VII Semester Major Project — Department of Computer Science & Engineering**  
**SDM College of Engineering & Technology, Dharwad**  
*Academic Project Specification: MajorProjectSynopsis.pdf*

---

## 1. Executive Summary

Modern enterprise networks continuously generate massive volumes of heterogeneous security events across perimeter gateways, identity directories, endpoint systems, and cloud infrastructure. Traditional SOC/SIEM architectures suffer from severe alert fatigue, fragmented point-solution dashboards, delayed incident triage, and manual response bottlenecks.

This project delivers a complete, enterprise-grade **Multi-Agent AI Security Operations Center (SOC)** platform for real-time threat detection, attack-path correlation, evidence-grounded incident investigation, risk assessment, automated SOAR defensive response, and response verification.

### Core Workflow
```
Security Event Collection → Threat Detection → Multi-Agent Analysis → Event Correlation → Attack-Path Analysis → Incident Investigation → Risk Assessment → Defensive Response → Response Verification
```

---

## 2. Multi-Agent AI SOC Architecture

The backend implements **10 specialized, autonomous cooperative agents** orchestrated through a unified pipeline (`MultiAgentSOCEngine`):

1. **Network Monitoring Agent** — Analyzes flow velocity, port diversity, unauthorized ingress sweeps, and horizontal/vertical reconnaissance.
2. **Authentication Agent** — Inspects authentication failures, credential stuffing bursts, brute-force patterns, and compromised account takeovers.
3. **Endpoint Agent** — Examines host-level process trees, Living-Off-The-Land Binaries (LOLBins), unauthorized privilege escalation, and sensitive file staging.
4. **Malicious Behaviour Agent** — Cross-correlates multi-domain telemetry to uncover coordinated kill-chain combinations (e.g., Ingress + Auth + Escalation + Data Staging).
5. **Anomaly Detection Agent** — Applies an unsupervised **Isolation Forest** machine learning model (`anomaly_engine`) and robust statistical baselines to detect multivariate outliers with explainability reasons.
6. **Threat Intelligence (CTI) Agent** — Enriches observables (IPs, domains, hashes) against a curated Cyber Threat Intelligence repository with threat actor attribution and reputation scoring.
7. **Correlation Agent** — Clusters fragmented detections into unified, actionable **Incidents** across temporal proximity and shared entities (IP, user, host).
8. **Attack-Path Analysis Agent** — Maps multi-hop adversarial traversal across network topologies (`Attacker IP → User Identity → Endpoint Host → Server → Crown Jewel Resource`) with confidence-weighted graph edges.
9. **Investigation Agent** — Produces structured Root Cause Analysis (RCA) answering the **8 canonical SOC investigative questions**:
   - What happened?
   - How did the incident begin?
   - Which systems and accounts were affected?
   - Which activities occurred?
   - What is the likely attack sequence?
   - What evidence supports this conclusion?
   - What remains uncertain?
   - What should happen next?
10. **Response Agent** — Formulates policy-governed SOAR containment playbooks (Firewall IP block, Active Directory account lock, EDR host isolation) with dry-run safety modes.

---

## 3. Key Platform Capabilities

- **SOC Command Center:** Real-time KPI dashboard, Recharts event & alert trends, severity distribution donut, category breakdown, agent health monitor, recent incidents, and live SIEM stream.
- **Real-Time Asynchronous Ingestion Queue:** Non-blocking event submission with immediate HTTP response (<10ms) and background pipeline worker loop with zero data loss recovery on restart.
- **Genuine Rolling-Window Detection:** Dynamic historical sliding window evaluation over database records to detect progressive threats (brute force login bursts, stealth port sweeps) arriving one-by-one.
- **Event-Driven Agent Routing:** Selectively invokes only the domain-relevant agents (Authentication, Network, Endpoint, Anomaly, Threat Intel, Correlation, Attack-Path, RCA Investigation, Response) based on incoming telemetry signatures.
- **Persistent Telemetry Collectors:**
  - *FastAPI REST Ingestion Gateway*
  - *Continuous Linux Log Tail Collector* (`auth.log` with byte offset checkpointing & rotation detection)
  - *Syslog UDP Collector* (Listening on port 5514)
  - *Continuous Live Demo Stream Generator* (Rate controlled 0.5 - 4.0 events/sec)
- **Persistent WebSocket Streaming (`/api/ws`):** Bi-directional live channel with auto-reconnect and heartbeat ping, updating Dashboard, Events, Agents, and Incidents in real time without page refreshes.
- **Ingestion & Pipeline Health Monitor (`/health-monitor`):** Real-time monitoring of queue depth, throughput velocity (epm), measured detection latency (~53-86 ms), measured incident latency (~950 ms), active collector statuses, and operational freshness warnings.
- **Attack-Path Topology Visualization:** Interactive graph component displaying directed hops, entity roles (attacker, compromised, target), and detailed node metadata inspector.
- **Transparent Risk Scoring Engine:** Deterministic 0–100 scoring model based on attack stage progression, asset criticality multipliers, account privilege weighting, and telemetry volume.
- **Policy-Governed SOAR Response:** Human-in-the-loop approval desk, execution in an isolated test environment (simulated firewall, IAM, EDR), and dry-run safety by default.
- **Mandatory Response Verification:** Evaluates subsequent post-mitigation telemetry to verify whether threats are contained (`VERIFIED_CONTAINED`, `VERIFICATION_FAILED`, `PENDING_VERIFICATION`).
- **Virtual Enterprise Network Lab (`/virtual-lab`):** Multi-machine network topology with isolated subnet (`192.168.56.0/24`) connecting Endpoint VM (`192.168.56.10`), Server VM (`192.168.56.15`), Attacker VM (`192.168.56.20`), and SOC Host (`192.168.56.1`). Features guest daemon heartbeat reporting, authentic `/var/log/auth.log` log tailing, live socket connection tracking, and real `iptables` SOAR containment enforcement.
- **Historical Dataset Lab:** Supervised machine learning benchmarking on standard datasets (**UNSW-NB15** and **CICIDS2017**) with strict train/test separation, confusion matrix, accuracy, precision, recall, F1, and FPR.
- **Branded Report Generation:** Downloadable PDF Incident Dossiers and SOC Executive Briefings generated via ReportLab in the Royal Enterprise color palette.
- **Demo Attack Lab & Stream Controller:** Continuous real-time stream controller (start, pause, resume, stop) plus 4 reproducible one-shot attack scenarios with safe Lab Reset.

---

## 4. UI/UX Design System — Royal Enterprise SOC

The interface adheres to the Royal Enterprise SOC design system:
- **Midnight Navy (`#0B1020`):** Core dark background
- **Deep Navy Surfaces (`#111A2E`):** Cards, panels, drawers
- **Royal Purple (`#6D5AE6`):** Primary brand accent
- **Champagne Gold (`#D8B875`):** Secondary accent, badges & highlights
- **Soft White (`#F5F7FC`):** Primary typography
- **Muted Slate (`#94A3B8`):** Secondary metadata and borders
- **Success Green (`#2DBE85`), Warning Amber (`#F4B942`), Critical Red (`#F05265`)**

Responsive across Desktop (1440px/1280px), Laptop (1024px), Tablet (768px), and Mobile (375px/320px).

---

## 5. Getting Started & Installation

### Prerequisites
- Python 3.11+ (Python 3.13 tested)
- Node.js 18+ & npm
- Git

### 1. Backend Setup
```bash
# From repository root
uv venv --python 3.13
# or python -m venv .venv

# Install dependencies
uv pip install -r backend/requirements.txt --python .\.venv\Scripts\python.exe
uv pip install email-validator --python .\.venv\Scripts\python.exe
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run build
cd ..
```

### 3. Running Automated Tests
```bash
.\.venv\Scripts\python.exe -m pytest backend/tests/test_soc_core.py -v
```
All 6 test suites pass covering authentication, threat intelligence, ML anomaly model, multi-agent pipeline, SOAR response execution, and PDF report generation.

### 4. Starting the Application
In terminal 1 (Backend):
```bash
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```
Backend API and OpenAPI docs will be available at:
- **API Base:** `http://127.0.0.1:8000`
- **Interactive Swagger Docs:** `http://127.0.0.1:8000/docs`

In terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```
Frontend will be available at:
- **Web Interface:** `http://localhost:3000`

### 5. Validating via Independent Live Event Source
To demonstrate completely hands-free automatic threat detection from an external data source without clicking any UI buttons:
```bash
# In terminal 3 (External Telemetry Sender):
.\.venv\Scripts\python.exe scripts/send_live_events.py --scenario brute_force --rate 2.0

# Or test multi-stage intrusion:
.\.venv\Scripts\python.exe scripts/send_live_events.py --scenario account_compromise --rate 2.0
```
Observe the events arriving over WebSockets in the SOC Dashboard, the Authentication/Endpoint Agent executing, rules triggering findings, an Incident being correlated, and risk being calculated in real time!

### 6. Running the Virtual Enterprise Network Lab
To launch the 3 virtual nodes (Endpoint Workstation, Internal Enterprise Server, Attacker Testbed) as live guest daemons:
```bash
# In a separate terminal:
.\.venv\Scripts\python.exe virtual-lab\run_local_virtual_nodes.py
```
Or provision full virtual machines inside Oracle VirtualBox:
```bash
cd virtual-lab
vagrant up
```
Navigate to **[http://localhost:3000/virtual-lab](http://localhost:3000/virtual-lab)** to inspect the live network topology, node reachability, guest telemetry stream, and trigger controlled attacks from the Attacker VM!

---

## 6. Default Demo Credentials

The database auto-seeds default credentials on initial startup:

| Role | Username | Password |
|---|---|---|
| **SOC Admin** | `admin` | `Admin@SOC2026!` |
| **SOC Analyst** | `analyst` | `Analyst@SOC2026!` |

*(Quick-fill buttons are provided on the login page for convenience during evaluation).*

---

## 7. College Project Demonstration Guide

1. **Login** using the `admin` quick-fill button.
2. Navigate to **Demo Attack Lab** (`/demo`).
3. Click **Launch Attack Scenario** on **Scenario 3: Multi-Stage Account Compromise**.
4. Observe the live pipeline:
   - Ingests failed login, success post-burst, privilege escalation, and sensitive file staging.
   - **Threat Intelligence Agent** attributes C2 IP `198.51.100.23` to APT29.
   - **Correlation Agent** unifies the sequence into a Critical Incident.
   - **Attack-Path Agent** constructs the visual traversal graph.
   - **Investigation Agent** synthesizes the 8-question Root Cause Analysis.
   - **Response Agent** formulates containment recommendations.
5. Click **Investigate Incident** to inspect the 12-section Investigation Workspace.
6. In the **SOAR Defensive Response Console**, click **Approve Action** and then **Execute in Sandbox**.
7. Click **Run Response Verification** to confirm subsequent traffic is contained.
8. Click **Download Incident Dossier PDF** to review the branded forensic report.
9. Visit **Historical Lab** (`/evaluation`) and click **Execute Evaluation Run** to benchmark Random Forest on `UNSW-NB15`.

---

## 8. License & Attribution

Designed and developed for the VII Semester Major Project at SDM College of Engineering & Technology, Dharwad.  
Reference Specification: `MajorProjectSynopsis.pdf`.
