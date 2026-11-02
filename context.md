# Project Context: Multi-Agent AI Security Operations Center (SOC)

## 1. Project Identification & Metadata
- **Project Title:** Multi-Agent AI Security Operations Center (SOC) for Real-Time Threat Detection
- **Academic Context:** VII Semester Major Project — Department of Computer Science & Engineering, SDM College of Engineering & Technology (SDMCET), Dharwad
- **Authors:** Deepak, Isha U Prabhu, Ishank Kumar, Kaveri Jarali
- **Faculty Guide:** Dr. Rani Shetty
- **Repository:** `https://github.com/Kaveri-Bhimappa-Jarali/MultiAgent_AI.git`
- **Current Operational Status:** Software 100% verified (52/52 automated test passes, production build passing, active backend & frontend running).

---

## 2. Problem Statement & System Purpose
Traditional enterprise SIEM (Security Information and Event Management) systems produce high volumes of disconnected alerts across firewalls, authentication systems, and endpoints. Human SOC analysts face severe **alert fatigue**, leading to delayed triage, uncontained lateral movement, and high mean-time-to-respond (MTTR).

This system provides an **autonomous multi-agent AI architecture** capable of:
1. Ingesting and normalizing heterogeneous enterprise security logs in real time.
2. Executing dual-layer threat detection: deterministic MITRE ATT&CK rule engines coupled with supervised and unsupervised machine learning models.
3. Coordinating **10 specialized AI agents** that iteratively investigate, correlate, and contextualize security telemetry.
4. Performing temporal and entity graph clustering to synthesize unified **Security Incidents** from fragmented events.
5. Calculating a bounded, explainable 7-factor risk score (0–100) per incident.
6. Automatically reconstructing a dynamic directed attack-path graph $G = (V, E)$ displaying adversary traversal.
7. Conducting automated forensic Root Cause Analysis (RCA) addressing the 8 canonical SOC investigative questions.
8. Formulating policy-governed SOAR (Security Orchestration, Automation, and Response) containment playbooks with human-in-the-loop analyst approval gates, dry-run safety modes, 1-click rollback, and post-response verification.

---

## 3. End-to-End Operational Lifecycle & Flow
```
                      [ Raw Telemetry Ingestion ]
           (Network packets, Auth logs, Endpoint process trees)
                                   ↓
                   [ Normalization & Deduplication ]
     (WAL SQLite/PostgreSQL ingestion with duplicate hash suppression)
                                   ↓
                   [ Dual-Layer Detection Engine ]
     (MITRE ATT&CK Rules + Isolation Forest Anomaly + Random Forest ML)
                                   ↓
       [ Multi-Agent Pipeline (10 Specialized Agents Cooperating) ]
                                   ↓
                   [ Entity & Temporal Correlation ]
              (Clusters individual events into an Incident)
                                   ↓
                   [ Dynamic Attack Path Graph ]
         (Visualizes: Attacker IP → Compromised User → Server → DB)
                                   ↓
             [ Automated Root Cause Analysis (RCA) & Risk ]
              (Answers the 8 canonical SOC forensic questions;
                   Computes deterministic 0–100 risk score)
                                   ↓
                  [ SOAR Playbook Formulation & Actions ]
    (Firewall IP blocks, host isolation, user account suspension with rollback)
                                   ↓
                    [ Real-Time React Dashboard ]
              (WebSockets live alert stream & PDF dossier exports)
```

---

## 4. The 10 Autonomous SOC Agents
The backend orchestrator (`MultiAgentSOCEngine`) executes a sequential, state-sharing pipeline where each agent consumes a shared blackboard context and emits structured findings:

| # | Agent Name | Class / File | Primary Function | Specific Rules & Algorithms |
|:---:|:---|:---|:---|:---|
| **1** | **Network Monitoring Agent** | `NetworkMonitoringAgent`<br>`backend/app/agents/network_agent.py` | Inspects connection flows, sweeps, volume bursts, and ML flow classifications. | `RULE-NET-001` (Port Scan)<br>`RULE-ML-001` (Flow Intrusion via Random Forest) |
| **2** | **Authentication Agent** | `AuthenticationAgent`<br>`backend/app/agents/auth_agent.py` | Tracks failed authentication sequences, credential stuffing, and account takeovers. | `RULE-AUTH-001` (Brute Force burst)<br>`RULE-AUTH-002` (Account Takeover post-burst) |
| **3** | **Endpoint Agent** | `EndpointAgent`<br>`backend/app/agents/endpoint_agent.py` | Inspects OS process trees, LOLBins, script abuse, and privilege escalation. | `RULE-PROC-001` (Suspicious script/LOLBin)<br>`RULE-PROC-002` (Privilege Escalation) |
| **4** | **Anomaly Detection Agent** | `AnomalyDetectionAgent`<br>`backend/app/agents/anomaly_detection_agent.py` | Evaluates multi-dimensional behavioral anomalies using an unsupervised **Isolation Forest**. | `RULE-ANOM-001` (Multivariate Outlier: 7 numeric features including cmd length, off-hours, failures) |
| **5** | **Malicious Behaviour Agent** | `MaliciousBehaviourAgent`<br>`backend/app/agents/malicious_behaviour_agent.py` | Identifies coordinated kill-chain combinations across disparate domains. | `RULE-FILE-001` (Ransomware encryption burst)<br>Living-off-the-land multi-domain activity |
| **6** | **Threat Intelligence (CTI) Agent** | `ThreatIntelligenceAgent`<br>`backend/app/agents/threat_intel_agent.py` | Matches IPs, domains, and hashes against internal threat intelligence IOC databases. | `RULE-NET-002` (Known C2 / Cobalt Strike Team Server match, APT attribution) |
| **7** | **Correlation Agent** | `CorrelationAgent`<br>`backend/app/agents/correlation_agent.py` | Groups related alerts across common entities (IPs, usernames, hostnames) and sliding time windows. | Clusters candidate events into unified **Incidents**; links affected assets and identities. |
| **8** | **Attack-Path Analysis Agent** | `AttackPathAgent`<br>`backend/app/agents/attack_path_agent.py` | Models adversarial traversal as a dynamic directed graph $G = (V, E)$ with nodes and edges. | Generates topological hops: `Attacker IP → Compromised Identity → Intermediate Server → Target DB`. |
| **9** | **Investigation Agent** | `InvestigationAgent`<br>`backend/app/agents/investigation_agent.py` | Performs automated forensic Root Cause Analysis (RCA) answering the 8 canonical SOC questions. | Outputs structured JSON RCA with timeline, severity breakdown, business impact, and remediation steps. |
| **10** | **Response Agent (SOAR)** | `ResponseAgent`<br>`backend/app/agents/response_agent.py` | Formulates policy-governed containment actions with safety gates and rollback capability. | Playbook actions: `BLOCK_IP`, `DISABLE_USER`, `ISOLATE_HOST`. Evaluates risk thresholds for containment. |

---

## 5. Threat Detection & Machine Learning Details

### 5.1 Dual-Layer Detection Model
1. **Deterministic Layer:** Explicit detection rules indexed against the MITRE ATT&CK matrix (T1110 Brute Force, T1059 Command Scripting, T1046 Network Service Discovery, T1071 C2 Communication, T1068 Privilege Escalation).
2. **Machine Learning Layer:**
   - **Supervised Classifier:** 100-Tree Balanced Random Forest trained on genuine network flow records.
   - **Unsupervised Anomaly Detector:** 7-feature Isolation Forest for zero-day/novel behavioral deviations.

### 5.2 Authentic Dataset Provenance
All synthetic generators were eliminated in favor of genuine institutional benchmarks:
- **UNSW-NB15 Benchmark:** `data/raw/unsw_nb15/UNSW_NB15_training-set.csv` (14.59 MB, 82,332 records across 9 attack families: Fuzzers, Analysis, Backdoors, DoS, Exploits, Generic, Reconnaissance, Shellcode, Worms).
- **CICIDS2017 Benchmark:** `data/raw/cicids2017/Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv` (73.34 MB, 286,467 records).

### 5.3 Leak-Free Preprocessing Pipeline (`ml/preprocessing/pipeline.py`)
- **Strict Split Before Fit:** Stratified train/validation/test split (`random_state=42`) executed prior to any scaling or transformation.
- **Zero Data Leakage:** `RobustScaler` and feature median imputation dictionaries are fitted strictly on `X_train` and subsequently applied to validation and test partitions. Identifiers and target-derived columns are excluded.

### 5.4 Empirical Held-Out Performance Metrics
| Metric | UNSW-NB15 Benchmark | CICIDS2017 Benchmark |
| :--- | :---: | :---: |
| **Model Type** | 100-Tree Balanced Random Forest | 100-Tree Balanced Random Forest |
| **Held-Out Test Samples** | **2,203 samples** (Stratified) | **2,915 samples** (Stratified) |
| **Accuracy** | **97.59%** | **99.86%** |
| **Precision** | **95.37%** | **77.78%** |
| **Recall** | **99.50%** | **100.00%** |
| **F1-Score** | **0.9739** | **0.8750** |
| **ROC-AUC** | **0.9972** | **0.9998** |

---

## 6. Risk Scoring & Forensic RCA Engine

### 6.1 Bounded 7-Factor Mathematical Risk Formula (0–100)
Risk scores are deterministically computed rather than assigned arbitrarily:
$$\text{RiskScore} = \text{clamp}_{[0, 100]}\Big( w_1 \cdot S_{\text{rules}} + w_2 \cdot C_{\text{ML}} + w_3 \cdot B_{\text{CTI}} + w_4 \cdot A_{\text{criticality}} + w_5 \cdot K_{\text{killchain}} - w_6 \cdot U_{\text{uncertainty}} \Big)$$
- Produces reproducible, audit-compliant scores categorized into Low, Medium, High, and Critical.
- Sub-520ms calculation SLA.

### 6.2 The 8 Canonical SOC Investigative Questions (RCA)
Every generated incident automatically answers:
1. **Who is the adversary?** (Attacker IP, geolocation, threat actor / APT attribution).
2. **What was the initial entry vector?** (Phishing, brute force, unpatched service exploit).
3. **When did the attack occur?** (Precise UTC timestamps of first event, pivot, and last event).
4. **Which assets and identities are compromised?** (Usernames, hostnames, IP addresses, MAC addresses).
5. **What actions did the adversary take?** (Reconnaissance, credential dumping, lateral movement, data staging).
6. **What is the current blast radius and business impact?** (Affected services, databases, compliance impact).
7. **What is the analytical confidence?** (Confidence percentage based on rule corroboration and ML probability).
8. **What are the prioritized remediation steps?** (Immediate containment playbooks and long-term hardening).

---

## 7. SOAR Containment & Safety Controls
1. **Containment Actions:**
   - `BLOCK_IP`: Firewall perimeter rule insertion dropping attacker source traffic.
   - `DISABLE_USER`: Identity provider account suspension revoking active sessions.
   - `ISOLATE_HOST`: Network quarantine isolating infected host except for SOC telemetry.
2. **Safety & Governance Controls:**
   - **Analyst Approval Gates:** High-impact containment actions require human analyst authorization.
   - **Dry-Run Mode:** Executes simulated containment without modifying network or system state to evaluate impact.
   - **1-Click Rollback:** Every executed action can be immediately reversed with a single click or API call.
   - **7-State Response Verification Lifecycle:** Transitions through `PENDING_APPROVAL` $\rightarrow$ `APPROVED` $\rightarrow$ `DISPATCHED` $\rightarrow$ `EXECUTED` $\rightarrow$ `MONITORING` $\rightarrow$ `SIMULATED_RESPONSE_VERIFIED` / `ACTUAL_LAB_RESPONSE_VERIFIED` $\rightarrow$ `ROLLED_BACK`.

---

## 8. Technology Stack & Implementation Architecture

### 8.1 Backend Services
- **Framework:** Python 3.11+ / FastAPI
- **Data Layer:** SQLAlchemy 2.0 ORM with SQLite default (`soc_enterprise.db`) and PostgreSQL support.
- **Real-Time Streaming:** FastAPI WebSockets (`/api/ws/events`) broadcasting live telemetry to connected dashboards.
- **Reporting:** ReportLab library producing downloadable PDF forensic dossiers and executive markdown summaries.
- **Authentication:** OAuth2 with JWT (JSON Web Tokens), bcrypt password hashing, and role-based access control (`admin`, `analyst`).

### 8.2 Frontend Web Dashboard
- **Framework:** React 18, TypeScript, Vite
- **Styling:** TailwindCSS, responsive dark-mode SOC command aesthetic.
- **Components:** Live Alert Ticker, Incident Investigation Workbench, Interactive Attack-Path Graph Canvas, SOAR Action Approval Center, Collector Health Monitor, Metrics & PDF Dossier Downloader.

### 8.3 Virtual Lab & Collector Daemons
- **Design:** Simulates a 3-node enterprise subnet (`vm-endpoint-01: 192.168.56.10`, `vm-server-01: 192.168.56.15`, `vm-attacker-01: 192.168.56.20`).
- **Execution Modes:**
  - *Full VirtualBox Hypervisor Mode:* Managed via `virtual-lab/Vagrantfile` provisioning genuine Linux VMs.
  - *Local Node Daemon Mode:* Managed via `virtual-lab/run_local_virtual_nodes.py`, executing 3 concurrent processes with independent token authentication, offline event buffering, and API heartbeat telemetry.

---

## 9. Codebase File Structure
```
MultiAgent_AI/
├── backend/
│   ├── app/
│   │   ├── agents/                     # 10 Autonomous SOC Agents & Orchestrator
│   │   │   ├── anomaly_detection_agent.py
│   │   │   ├── attack_path_agent.py
│   │   │   ├── auth_agent.py
│   │   │   ├── base.py
│   │   │   ├── correlation_agent.py
│   │   │   ├── endpoint_agent.py
│   │   │   ├── investigation_agent.py
│   │   │   ├── malicious_behaviour_agent.py
│   │   │   ├── network_agent.py
│   │   │   ├── orchestrator.py         # MultiAgentSOCEngine
│   │   │   ├── response_agent.py
│   │   │   └── threat_intel_agent.py
│   │   ├── api/                        # REST & WebSocket API Routers
│   │   ├── models/                     # SQLAlchemy ORM Models
│   │   ├── schemas/                    # Pydantic Request/Response Schemas
│   │   ├── services/                   # ML inference, CTI, reporting, broadcaster
│   │   ├── main.py                     # FastAPI entry point & startup seeder
│   │   └── database.py                 # Engine & session management
│   ├── requirements.txt
│   └── tests/                          # 16 Pytest unit & integration tests
├── frontend/                           # React 18 / Vite / TypeScript Dashboard
│   ├── src/
│   │   ├── components/                 # SOC widgets, attack graphs, approval modals
│   │   ├── pages/                      # Dashboard, Incidents, Alerts, Lab Monitor
│   │   └── services/                   # REST API client & WebSocket listener
│   ├── package.json
│   └── vite.config.ts
├── data/
│   ├── raw/                            # Authentic benchmark datasets (UNSW-NB15, CICIDS2017)
│   └── schemas/                        # Dataset schemas
├── ml/
│   ├── models/                         # Trained model artifacts (.joblib)
│   ├── preprocessing/                  # Leak-free feature transformer pipelines
│   └── training/                       # Offline model training scripts
├── virtual-lab/                        # 3-node enterprise lab (Vagrantfile & daemon runner)
├── scripts/                            # Verification, test, & dataset download scripts
├── docs/                               # Architecture, deployment, & user guides
├── FINAL_TEST_REPORT.md                # Empirical test execution audit
├── FINAL_ACCEPTANCE_CHECKLIST.md       # Syllabus requirements traceability matrix
└── KNOWN_LIMITATIONS.md                # Transparent engineering boundaries
```

---

## 10. Automated Test Results & Verification
All tests executed on host development environment:
- **Backend Pytest Suite:** 16 / 16 passed (**100% pass rate**) in 15.86s.
- **REST & WebSocket Integration:** 12 / 12 passed.
- **Phase 10 Acceptance Verification:** 9 / 9 passed.
- **Dynamic Telemetry & False-Alarm Audit:** 6 / 6 passed.
- **Frontend Production Build:** Clean compilation via `tsc -b && vite build` in 22.46s.
- **Total Software Automated Tests:** **52 / 52 passed (100%)**.

---

## 11. Known Limitations & Environmental Constraints
- **Hardware Virtualization Boundary:** On systems with $<8\text{ GB}$ physical RAM or non-elevated user contexts lacking kernel hypervisor drivers (VirtualBox/VMware), launching 3 concurrent hardware Linux VMs is blocked by environment constraints. The system provides a verified local process daemon runner (`virtual-lab/run_local_virtual_nodes.py`) simulating all 3 nodes.
- **Containment in Simulation Mode:** In local simulated node mode, firewall containment executes in `DRY_RUN` and `SIMULATED_RESPONSE_VERIFIED` mode rather than modifying actual kernel `iptables` of the host operating system.
