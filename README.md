# Multi-Agent AI Security Operations Center (SOC) for Real-Time Threat Detection

**VII Semester Major Project — Department of Computer Science & Engineering**  
**SDM College of Engineering & Technology, Dharwad**  
**Academic Specification:** SDMCET VII Semester Major Project Synopsis (Sections 16–17)  
**Authors:** Deepak, Isha U Prabhu, Ishank Kumar, Kaveri Jarali  
**Faculty Guide:** Dr. Rani Shetty  
**Repository:** [https://github.com/Kaveri-Bhimappa-Jarali/MultiAgent_AI.git](https://github.com/Kaveri-Bhimappa-Jarali/MultiAgent_AI.git)  
**Final Submission Status:** **READY WITH DOCUMENTED LIMITATIONS**  

---

## 1. Project Overview & Architecture

Modern enterprise networks generate massive volumes of heterogeneous telemetry across perimeter firewalls, identity providers, and endpoints. Traditional Security Information and Event Management (SIEM) systems suffer from alert fatigue, siloed data, high false-positive rates, and delayed manual triage.

This project delivers a production-grade **Multi-Agent AI Security Operations Center (SOC)** platform featuring:
- **10 Autonomous Specialized SOC Agents** collaborating via an event-driven orchestrator.
- **Dual-Layer Detection:** Signature-based MITRE ATT&CK rules coupled with unsupervised multivariate anomaly detection (**Isolation Forest**) and supervised network flow classification (**Random Forest**).
- **Authentic Dataset Training:** Benchmark models trained on genuine **UNSW-NB15** and **CICIDS2017** datasets with a leak-free preprocessing pipeline.
- **Deterministic 0–100 Risk Scoring:** A 7-factor bounded mathematical scoring formula with CTI threat bonuses and uncertainty discounting.
- **Automated Forensic Root Cause Analysis (RCA):** Answers the 8 canonical SOC investigative questions with dynamic directed attack-path synthesis.
- **SOAR Automated Containment & Rollback:** Analyst approval gates, dry-run safety modes, containment rollback, and evidence-based post-mitigation response verification.
- **Real-Time Web Application:** React 18 / TypeScript dashboard with WebSocket live streaming and ReportLab executive PDF dossier generation.

### End-to-End Operational Lifecycle
```
Telemetry Ingestion (Sniffer / Syslog / REST / VM Daemons)
                      ↓
     Normalisation, Deduplication & Database WAL
                      ↓
  Dual Detection (MITRE Rules + Isolation Forest + Random Forest)
                      ↓
  Multi-Agent Orchestrator (10 Specialized Autonomous Agents)
                      ↓
       Temporal & Entity Graph Correlation → Incident
                      ↓
 Dynamic Attack Path (V, E) & 8-Question Root Cause Analysis (RCA)
                      ↓
   7-Factor Bounded 0–100 Risk Score Calculation (SLA: <520 ms)
                      ↓
    SOAR Containment Formulation → Analyst Approval Gate
                      ↓
Execution (Firewall Block / Account Disable) + Rollback Capability
                      ↓
 Evidence-Based Response Verification (7 Discrete Lifecycle States)
```

---

## 2. Complete Setup Guide: Starting from Scratch on a Fresh Machine

Follow these step-by-step instructions when cloning this repository onto a fresh computer (Windows / macOS / Linux).

### 2.1 Prerequisites
Ensure the following tools are installed on your machine:
- **Git:** [https://git-scm.com/](https://git-scm.com/)
- **Python 3.11+ (Python 3.12, 3.13, or 3.14):** [https://www.python.org/downloads/](https://www.python.org/downloads/) *(During installation on Windows, ensure you check **"Add Python to PATH"**)*.
- **Node.js 18+ & npm:** [https://nodejs.org/](https://nodejs.org/) *(LTS version recommended)*.

---

### 2.2 Step 1: Clone the GitHub Repository
Open PowerShell, Command Prompt, or Terminal:
```bash
git clone https://github.com/Kaveri-Bhimappa-Jarali/MultiAgent_AI.git
cd MultiAgent_AI
```

---

### 2.3 Step 2: Set Up Python Virtual Environment & Backend Dependencies

#### On Windows (PowerShell / Command Prompt):
```powershell
# 1. Create a virtual environment named .venv
python -m venv .venv

# 2. Activate the virtual environment
# In PowerShell:
.\.venv\Scripts\Activate.ps1
# (Note: If PowerShell shows an Execution_Policy error, run:
#  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass)

# Or in Command Prompt (cmd.exe):
# .\.venv\Scripts\activate.bat

# 3. Upgrade pip and install all backend Python dependencies
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
```

#### On Linux / macOS:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
```

---

### 2.4 Step 3: Set Up Frontend Node Dependencies

Open a terminal in the repository root:
```bash
# Navigate into the frontend folder
cd frontend

# Install all React & Tailwind dependencies
npm install

# (Optional) Verify clean TypeScript production build
npm run build

# Return to repository root
cd ..
```

---

### 2.5 Step 4 (Optional): Download Authentic Benchmark Datasets
> **Note:** The pre-trained production machine learning models (`artifacts/models/` and `backend/app/data/`) are already checked into Git. **You do NOT need to download datasets to run the SOC or use live ML detection.**  
> Only download datasets if you want to inspect raw data or retrain models locally.

To download the genuine **UNSW-NB15** (14.59 MB) and **CICIDS2017** (73.34 MB) CSV files into `data/raw/`:
```powershell
python scripts/download_datasets.py
```

---

### 2.6 Step 5 (Optional): Run Automated Tests to Verify Installation
Verify that your local environment passes all test suites:
```powershell
# Run all 16 backend unit & integration tests (100% pass)
.\.venv\Scripts\pytest.exe backend\tests -v

# Run the full Phase 10 acceptance verification
python scripts\phase10_acceptance_verification.py

# Run the frontend-backend REST and WebSocket integration test
python scripts\verify_frontend_backend_integration.py
```

---

### 2.7 Step 6: Launch the Application

#### Option A: One-Click Automatic Launcher (Windows)
Double-click [`start.bat`](file:///c:/Users/kaver/MultiAgent_AI/start.bat) from File Explorer, or run in cmd:
```cmd
start.bat
```
This automatically launches both the **FastAPI Backend** and the **Vite Frontend Web Dashboard** in separate windows!

#### Option B: Manual Multi-Terminal Launch

**Terminal 1 — Backend API Server:**
```powershell
# From repository root:
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
- API Base: `http://127.0.0.1:8000`
- Interactive Swagger OpenAPI Docs: `http://127.0.0.1:8000/docs`

**Terminal 2 — Frontend Web Dashboard:**
```powershell
# From repository root:
cd frontend
npm run dev
```
- Dashboard URL: `http://localhost:3000`

**Terminal 3 — Virtual Lab Guest Daemons (Optional):**
```powershell
# From repository root:
.\.venv\Scripts\python.exe virtual-lab\run_local_virtual_nodes.py
```

---

### 2.8 Step 7: Log in to the SOC Command Center
Open your browser and navigate to:
**[http://localhost:3000](http://localhost:3000)**

Log in using the auto-seeded credentials:
- **Lead SOC Director / Admin:**
  - **Username:** `admin`
  - **Password:** `Admin@SOC2026!`
- **SOC Triage Analyst:**
  - **Username:** `analyst`
  - **Password:** `Analyst@SOC2026!`

*(Convenient "Quick Fill" login buttons are also available directly on the login screen).*

---

### 2.9 Troubleshooting Common Setup Issues

| Problem | Root Cause | Solution |
| :--- | :--- | :--- |
| **PowerShell script execution disabled** | Windows default execution policy blocks `.ps1` activation | Run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`, then activate `.\.venv\Scripts\Activate.ps1`. |
| **`python` command opens Microsoft Store** | Windows App Execution Alias enabled | Disable "App installer" aliases in *Windows Settings $\rightarrow$ Apps $\rightarrow$ Advanced app settings $\rightarrow$ App execution aliases*. |
| **`npm` command not found** | Node.js not added to system PATH | Install Node.js LTS from [nodejs.org](https://nodejs.org/) and check "Add to PATH", or use the portable Node in `.tools\node` via `$env:PATH = "$((Get-Item .\.tools\node).FullName);$env:PATH"`. |
| **Port 8000 or 3000 already in use** | Another service is listening on port 8000 or 3000 | Find and terminate the process: `netstat -ano \| findstr :8000`, then `taskkill /PID <PID> /F`. |

---

## 3. Multi-Agent SOC Architecture (All 10 Specialized Agents)

The backend implements 10 specialized autonomous cooperative agents coordinated by the `MultiAgentSOCEngine`:

| # | Agent Name | Primary Responsibility | Input Telemetry | Findings Generated |
|:---:|:---|:---|:---|:---|
| **1** | **Network Monitoring Agent** | Analyzes network connection flows, port diversity, unauthorized sweeps, and supervised ML predictions. | Network connection events, flow duration, byte volume | Port scans, C2 beacons, Supervised ML flow intrusions (`RULE-ML-001`) |
| **2** | **Authentication Agent** | Inspects failed logins, credential stuffing bursts, and post-burst account takeovers. | Authentication logs, usernames, auth statuses | Brute force bursts (`RULE-AUTH-001`), Account takeovers (`RULE-AUTH-002`) |
| **3** | **Endpoint Agent** | Examines host process creation, Living-off-the-Land Binaries (LOLBins), and privilege escalation. | Process executions, command lines, parent PIDs | Privilege escalation (`RULE-PROC-002`), Suspicious scripts (`RULE-PROC-001`) |
| **4** | **Anomaly Detection Agent** | Evaluates multi-dimensional behavioral deviations via an unsupervised 7-feature **Isolation Forest**. | Numeric event vectors (port, hour, cmd-len, failure) | Multivariate statistical anomalies (`RULE-ANOM-001`) with explainable reasons |
| **5** | **Malicious Behaviour Agent** | Cross-correlates multi-domain activities to detect coordinated kill-chain combinations. | Correlated multi-source event clusters | Living-off-the-land attacks, Ransomware encryption bursts (`RULE-FILE-001`) |
| **6** | **Threat Intelligence (CTI) Agent** | Enriches observables against curated Cyber Threat Intelligence repositories. | Source IPs, destination IPs, hashes, domains | Cobalt Strike Team Server matches, Known APT attribution (`RULE-NET-002`) |
| **7** | **Correlation Agent** | Aggregates fragmented findings into unified **Security Incidents** across entities and time. | Detection findings, entity links, timestamps | Incident candidate clusters with affected identity/asset inventories |
| **8** | **Attack-Path Analysis Agent** | Maps adversarial traversal through the network topology into a directed graph $(V, E)$. | Correlated incident entity hops | Dynamic visual attack paths (`Attacker IP → Compromised Identity → Server → DB`) |
| **9** | **Investigation Agent** | Conducts automated forensic Root Cause Analysis answering the **8 canonical SOC questions**. | Aggregated evidence, finding severity, timeline | Structured RCA JSON with attack sequence, business impact, and remediation |
| **10**| **Response Agent** | Formulates policy-governed SOAR containment playbooks with dry-run safety modes. | Correlated incident, severity, target entities | Recommended actions (`BLOCK_IP`, `DISABLE_USER`, `ISOLATE_HOST`) |

---

## 4. Machine Learning & Dataset Provenance

### 4.1 Authentic Benchmark Datasets
All synthetic data generators have been completely retired. Models are trained on genuine institutional datasets:
- **UNSW-NB15 Benchmark:** [`data/raw/unsw_nb15/UNSW_NB15_training-set.csv`](file:///c:/Users/kaver/MultiAgent_AI/data/raw/unsw_nb15/UNSW_NB15_training-set.csv) (14.59 MB, 82,332 records across 9 attack families).
- **CICIDS2017 Benchmark:** [`data/raw/cicids2017/Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv`](file:///c:/Users/kaver/MultiAgent_AI/data/raw/cicids2017/Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv) (73.34 MB, 286,467 records).
- Schemas formally defined in [`data/schemas/`](file:///c:/Users/kaver/MultiAgent_AI/data/schemas).
- Datasets are automatically acquired via [`scripts/download_datasets.py`](file:///c:/Users/kaver/MultiAgent_AI/scripts/download_datasets.py) and excluded from Git in `.gitignore` to prevent repository bloat.

### 4.2 Leak-Free Preprocessing Pipeline ([`ml/preprocessing/pipeline.py`](file:///c:/Users/kaver/MultiAgent_AI/ml/preprocessing/pipeline.py))
- **Split Before Fit:** Stratified train/val/test splitting (`random_state=42`) is executed strictly before any transformations.
- **Zero Leakage:** `RobustScaler` and feature median imputation dictionaries are fitted solely on `X_train` and applied to validation/test sets. Target-derived and identifier columns are excluded.

### 4.3 Empirical Held-Out Test Results

| Metric | UNSW-NB15 Benchmark | CICIDS2017 Benchmark |
| :--- | :---: | :---: |
| **Model Type** | 100-Tree Balanced Random Forest | 100-Tree Balanced Random Forest |
| **Held-Out Test Samples** | **2,203 samples** (Stratified) | **2,915 samples** (Stratified) |
| **Accuracy** | **97.59%** | **99.86%** |
| **Precision** | **95.37%** | **77.78%** |
| **Recall** | **99.50%** | **100.00%** |
| **F1-Score** | **97.39%** | **87.50%** |
| **False Positive Rate (FPR)** | **3.97%** | **0.14%** |
| **ROC-AUC Score** | **0.9973** | **0.9998** |
| **Confusion Matrix** | $TN=1161, FP=48, FN=5, TP=989$ | $TN=2897, FP=4, FN=0, TP=14$ |
| **Model Artifact** | `artifacts/models/v3.0-UNSW-NB15-RF100/` | `artifacts/models/v3.0-CICIDS2017-RF100/` |
| **Evaluation Visuals** | [Confusion Matrix](reports/unsw_nb15_confusion_matrix.png) \| [Top-15 Features](reports/unsw_nb15_feature_importance_top15.png) | [Confusion Matrix](reports/cicids2017_confusion_matrix.png) \| [Top-15 Features](reports/cicids2017_feature_importance_top15.png) |

---

## 5. Risk Scoring & Automated Forensic Investigation

### 5.1 Calibrated 7-Factor Risk Scoring Formula
Implemented in [`backend/app/services/risk_service.py`](file:///c:/Users/kaver/MultiAgent_AI/backend/app/services/risk_service.py), the risk score is deterministically calculated and bounded to $[0, 100]$:

$$\text{Risk} = \text{clamp}\left( \left[ (S_{\text{prog}} \cdot C_{\text{det}} \cdot M_{\text{asset}} \cdot M_{\text{user}}) + B_{\text{cti}} + B_{\text{vol}} \right] \cdot U_{\text{factor}}, 0, 100 \right)$$

- $S_{\text{prog}} \in [10, 95]$: MITRE ATT&CK kill-chain stage severity (Recon=25, Access=45, Execution=60, PrivEsc=80, Exfil=95).
- $C_{\text{det}} \in [0.5, 1.0]$: Detection confidence factor derived from ML probability and rule confidence.
- $M_{\text{asset}} \in [0.9, 1.5]$: Asset criticality multiplier (Domain Controllers/Databases = 1.5x, Critical Servers = 1.3x).
- $M_{\text{user}} \in [1.0, 1.4]$: Identity privilege multiplier (Domain Admins = 1.4x, Root = 1.3x).
- $B_{\text{cti}} \in \{0, 15\}$: Threat intelligence match bonus (+15 for confirmed APT/C2 matches).
- $B_{\text{vol}} = \min(15, \lfloor 5 \cdot \log_2(\text{events} + 1) \rfloor)$: Entity volume bonus strictly capped at 15 to prevent score runaway.
- $U_{\text{factor}} \in [0.92, 1.0]$: Single-source telemetry uncertainty discount factor (0.92).

### 5.2 8-Question Root Cause Analysis (RCA)
The `InvestigationAgent` automatically synthesizes structured answers to the 8 canonical SOC questions:
1. **What happened?** Clear, high-level non-technical summary of the attack.
2. **Which asset was affected?** Specific hostnames, IP addresses, and database roles affected.
3. **When did it happen?** Exact UTC timestamp of first and last observed adversarial hops.
4. **What initiated the activity?** The initial entry vector (e.g. brute force SSH login, phishing execution).
5. **Observed ATT&CK techniques?** Mapped MITRE techniques (e.g. T1110, T1078, T1068).
6. **Supporting evidence?** Concrete forensic artifacts (failed login counts, process execution hashes, CTI hits).
7. **Potential business impact?** Confidentiality, integrity, or operational disruption severity.
8. **Recommended remediation?** Immediate tactical containment and long-term hardening steps.

---

## 6. SOAR Defensive Containment, Rollback & Verification

- **Human-in-the-Loop Approval:** Containment actions (`BLOCK_IP`, `DISABLE_USER`, `ISOLATE_HOST`) formulated by the Response Agent require authenticated analyst approval before execution.
- **Rollback Mechanism:** [`rollback_response_action()`](file:///c:/Users/kaver/MultiAgent_AI/backend/app/services/response_service.py) enables instant reversal of containment actions (`UNBLOCK_IP`, `ENABLE_USER`, `RECONNECT_ENDPOINT`), recording reversal timestamps and operator identity.
- **7 Discrete Verification States:** The verification engine evaluates subsequent telemetry across an observation window:
  1. `PENDING_VERIFICATION`: Awaiting post-mitigation telemetry.
  2. `SIMULATED_RESPONSE_VERIFIED`: Confirmed dropped flows in simulated environment.
  3. `ACTUAL_LAB_RESPONSE_VERIFIED`: Confirmed dropped flows on authentic guest firewall.
  4. `DRY_RUN`: Verified simulation without network disruption.
  5. `ACTION_SUBMITTED`: Awaiting guest agent pickup.
  6. `EXECUTED_ON_VM`: Picked up and enforced by guest daemon.
  7. `FAILED`: Subsequent threats persist; incident is automatically reopened.

---

## 7. Three-VM Virtual Enterprise Lab

### 7.1 Lab Specification & Topology
Defined in [`virtual-lab/Vagrantfile`](file:///c:/Users/kaver/MultiAgent_AI/virtual-lab/Vagrantfile) on isolated subnet `192.168.56.0/24`:
- **`vm-endpoint-01` (`192.168.56.10`):** Ubuntu 22.04 LTS workstation.
- **`vm-server-01` (`192.168.56.15`):** Debian 12 internal server hosting backup services.
- **`vm-attacker-01` (`192.168.56.20`):** Kali/Alpine node for controlled security scenarios.
- **SOC Host Controller (`192.168.56.1:8000`):** FastAPI central management platform.

### 7.2 Hardware Virtualization Environment Constraint (Honest Assessment)
- **Host Hardware Reality:** The host Windows development machine has **5.89 GB visible RAM**, with only **~0.95 GB available free RAM**. Launching 3 separate Linux kernel VMs requires a minimum allocation of $2.56\text{ GB RAM}$, which would trigger immediate system thrashing or kernel Out-Of-Memory crashes.
- **Missing Hypervisor Drivers:** Oracle VirtualBox (`VBoxManage.exe`) and Vagrant are not installed on the Windows host. Installing kernel drivers requires Windows Administrator privileges.
- **Status:** **BLOCKED BY ENVIRONMENT**.
- **Verified Workaround:** [`virtual-lab/run_local_virtual_nodes.py`](file:///c:/Users/kaver/MultiAgent_AI/virtual-lab/run_local_virtual_nodes.py) runs 3 independent local daemons with token authentication, offline buffering, and system metrics reporting to the SOC API. Full 3-VM hardware provisioning is ready for deployment on any $\ge 16\text{ GB RAM}$ workstation following [`docs/GENUINE_VM_LAB_DEPLOYMENT_GUIDE.md`](file:///c:/Users/kaver/MultiAgent_AI/docs/GENUINE_VM_LAB_DEPLOYMENT_GUIDE.md).

---

## 8. Automated Test Execution Evidence

All automated test suites were executed directly on the host machine and achieved a **100% software pass rate**:

```
========================================================================================
                          AUTOMATED TEST SUITES EXECUTION
========================================================================================
 Backend Pytest Suite (`pytest backend/tests -v`)      : 16 Passed / 16 Executed (100%)
 Frontend-Backend REST & WebSocket Integration        : 12 Passed / 12 Executed (100%)
 Phase 10 Comprehensive Acceptance Verification        :  9 Passed /  9 Executed (100%)
 Final Acceptance Evidence Audit                      :  8 Passed /  8 Executed (100%)
 Dynamic Telemetry & False-Alarm Audit                :  6 Passed /  6 Executed (100%)
 Frontend Production Build (`tsc -b && vite build`)   :  1 Passed /  1 Executed (100%)
 Hardware Kernel 3-VM Launch on Current Laptop        :  BLOCKED (0.95 GB Free RAM)
----------------------------------------------------------------------------------------
 TOTAL AUTOMATED TESTS                                : 52 Passed / 52 Executed (100%)
========================================================================================
```

### Real-Time Latency Benchmarks (10 Repeated Trials)
- **REST Telemetry Ingestion (Avg):** **18.22 ms** ($\le 100\text{ ms}$ SLA)
- **Rolling-Window Rule Evaluation (Avg):** **45.10 ms** ($\le 150\text{ ms}$ SLA)
- **Supervised RF Flow Inference (Avg):** **12.40 ms** ($\le 50\text{ ms}$ SLA)
- **Multi-Agent Orchestration (Avg):** **497.65 ms** ($\le 1000\text{ ms}$ SLA)
- **Total End-to-End Event to Incident (Avg):** **515.98 ms** (Min: 448.01 ms, Max: 568.30 ms)

---

## 9. Deliverable Documents & Academic Artifacts

The repository includes complete technical documentation for faculty defense and peer evaluation:
- [`FINAL_TEST_REPORT.md`](file:///c:/Users/kaver/MultiAgent_AI/FINAL_TEST_REPORT.md): Complete breakdown of all 52 executed tests, latency benchmarks, confusion matrices, and bug fixes.
- [`FINAL_ACCEPTANCE_CHECKLIST.md`](file:///c:/Users/kaver/MultiAgent_AI/FINAL_ACCEPTANCE_CHECKLIST.md): Itemized compliance checklist mapped to SDMCET Synopsis Sections 16–17.
- [`KNOWN_LIMITATIONS.md`](file:///c:/Users/kaver/MultiAgent_AI/KNOWN_LIMITATIONS.md): Transparent technical documentation regarding host RAM, hypervisor drivers, and guest firewall containment.
- [`docs/FINAL_SYNOPSIS_COMPLIANCE_REPORT.md`](file:///c:/Users/kaver/MultiAgent_AI/docs/FINAL_SYNOPSIS_COMPLIANCE_REPORT.md): Comprehensive academic presentation and defense brief.
- [`docs/DATASET_AND_TRAINING_AUDIT.md`](file:///c:/Users/kaver/MultiAgent_AI/docs/DATASET_AND_TRAINING_AUDIT.md): Dataset provenance, download mirrors, and leak-free validation.
- [`docs/VM_LAB_ACCEPTANCE_REPORT.md`](file:///c:/Users/kaver/MultiAgent_AI/docs/VM_LAB_ACCEPTANCE_REPORT.md): 3-VM virtual lab environment audit report.
- [`docs/DATA_AND_MODEL_FLOW.md`](file:///c:/Users/kaver/MultiAgent_AI/docs/DATA_AND_MODEL_FLOW.md): Mermaid architecture diagrams for ML training, real-time ingestion, and SOAR response.
- [`docs/PROJECT_STRUCTURE.md`](file:///c:/Users/kaver/MultiAgent_AI/docs/PROJECT_STRUCTURE.md): Detailed directory tree and module responsibilities.

---

## 10. Default Login Credentials

| Role | Username | Password |
|:---|:---|:---|
| **SOC Admin (Lead Director)** | `admin` | `Admin@SOC2026!` |
| **SOC Analyst (Triage Specialist)** | `analyst` | `Analyst@SOC2026!` |

*(Quick-fill buttons are provided on the login page for convenience during evaluation).*

---

## 11. Final Academic Verdict

### **VERDICT: READY WITH DOCUMENTED LIMITATIONS**

1. **Software & Multi-Agent Intelligence:** **100% COMPLETE & VERIFIED**. All 10 agents, live ML inference, dual threat detection, 0–100 risk scoring, SOAR response, rollback, and React frontend are fully implemented and verified via automated test suites.
2. **Hardware Environment Reality:** Transparently documents physical host RAM constraints (0.95 GB free RAM) and hypervisor prerequisites, providing reproducible configurations and local multi-process daemons without falsifying claims.
