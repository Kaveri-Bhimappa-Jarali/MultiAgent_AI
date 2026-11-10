# Complete Installation & Environment Setup Guide

This guide provides exhaustive, step-by-step instructions for deploying the **Multi-Agent AI Security Operations Center (SOC)** platform from scratch on a fresh machine (Windows, Linux, or macOS).

---

## 1. System Requirements & Prerequisites

### 1.1 Minimum & Recommended Hardware
| Resource | Minimum (Software / Daemon Mode) | Recommended (Full Hypervisor 3-VM Lab) |
| :--- | :--- | :--- |
| **CPU** | 4 Cores (x86_64) | 8 Cores (Intel VT-x / AMD-V enabled) |
| **RAM** | 4 GB Free RAM | 16 GB RAM (minimum 8 GB Free) |
| **Storage** | 10 GB Free SSD Space | 40 GB Free SSD Space |
| **Network** | Loopback / 1 Gbps NIC | Dedicated virtual bridge adapter |
| **OS** | Windows 10/11, Ubuntu 22.04+, macOS 13+ | Windows 11 Enterprise, Ubuntu 22.04 LTS |

### 1.2 Required Software Packages
Before starting, ensure the following software is installed on your host system:
1. **Git (v2.30+)**: [https://git-scm.com/](https://git-scm.com/)
2. **Python (3.11, 3.12, or 3.13 / 3.14)**: [https://www.python.org/downloads/](https://www.python.org/downloads/)
   - *Windows Note:* Ensure the option **"Add Python to PATH"** is selected during installation.
3. **Node.js (18+ LTS or 20+) & npm**: [https://nodejs.org/](https://nodejs.org/)
4. *(Optional for live packet sniffing)* **Npcap / WinPcap (Windows)** or **libpcap (Linux)**:
   - Windows: [https://npcap.com/](https://npcap.com/) (Check *"Install Npcap in WinPcap API-compatible Mode"*).
   - Linux: `sudo apt install libpcap-dev`

---

## 2. Step-by-Step Installation

### Step 1: Clone the Repository
Open PowerShell, Command Prompt, or Terminal:
```bash
git clone https://github.com/Kaveri-Bhimappa-Jarali/MultiAgent_AI.git
cd MultiAgent_AI
```

---

### Step 2: Configure Python Virtual Environment

#### On Windows (PowerShell):
```powershell
# 1. Create a virtual environment named .venv
python -m venv .venv

# 2. Set script execution policy if restricted
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# 3. Activate the virtual environment
.\.venv\Scripts\Activate.ps1

# 4. Verify python path is using .venv
Get-Command python | Select-Object Source
```

#### On Windows (Command Prompt `cmd.exe`):
```cmd
python -m venv .venv
.\.venv\Scripts\activate.bat
```

#### On Linux / macOS (Bash / Zsh):
```bash
python3 -m venv .venv
source .venv/bin/activate
```

---

### Step 3: Install Backend Python Dependencies
With the virtual environment activated:
```bash
# Upgrade pip, wheel, and setuptools
python -m pip install --upgrade pip setuptools wheel

# Install all backend packages
pip install -r backend/requirements.txt
```

---

### Step 4: Install Frontend Node Dependencies
Open a second terminal window (or navigate within the same shell):
```bash
cd frontend

# Install all React, Vite, and Tailwind dependencies
npm install

# Verify clean production TypeScript build
npm run build

# Return to project root
cd ..
```

---

### Step 5: Environment Variables & Configuration (`.env`)
Create a `.env` file in `backend/` or repository root to configure application secrets and external integrations:

```ini
# =====================================================================
# MULTI-AGENT AI SOC CONFIGURATION
# =====================================================================

# Server & Environment
ENVIRONMENT=development
HOST=127.0.0.1
PORT=8000
SECRET_KEY=soc-enterprise-super-secret-jwt-key-2026!
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Database Configuration (Default: SQLite with WAL Mode)
DATABASE_URL=sqlite:///./soc_enterprise.db
# For PostgreSQL:
# DATABASE_URL=postgresql://soc_user:SecurePassword@localhost:5432/soc_enterprise

# Ingress Message Queue Configuration
# Options: "in_memory" (default ring buffer) or "kafka" (Apache Kafka broker)
QUEUE_TYPE=in_memory
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_TOPIC_TELEMETRY=telemetry.raw
KAFKA_TOPIC_ALERTS=alerts.high

# External Cyber Threat Intelligence (CTI) API Keys (Optional)
# Leave blank to use cached local threat intelligence database
ABUSEIPDB_API_KEY=
VIRUSTOTAL_API_KEY=
OTX_API_KEY=

# Automated Response & SOAR Policy
AUTO_CONTAINMENT_ENABLED=false
CONTAINMENT_RISK_THRESHOLD=75.0
VERIFICATION_OBSERVATION_WINDOW_SECONDS=60
```

---

### Step 6: Database Initialization & Migrations
The SQLite database (`soc_enterprise.db`) automatically initializes tables upon the first server launch. To verify schemas and run migration scripts explicitly:

```powershell
# Run the database migration check
.\.venv\Scripts\python.exe backend/app/db/ensure_event_processed_at_column.py
```

---

### Step 7: Machine Learning Model Setup
Pre-trained, high-performance machine learning models are already checked into the repository in:
- `artifacts/models/v3.0-UNSW-NB15-RF100/rf_model.pkl`
- `artifacts/models/v3.0-CICIDS2017-RF100/rf_model.pkl`
- `backend/app/ml/anomaly_model.pkl`

> **Note:** You do **NOT** need to download benchmark datasets to run the platform or perform live ML inference.  
> If you wish to retrain the models locally or inspect the raw training datasets:
> ```powershell
> python scripts/download_datasets.py
> python ml/train_random_forest.py
> ```

---

## 3. Running the Application

### Option A: One-Click Automatic Launcher (Windows Recommended)
Double-click [`start.bat`](file:///e:/kaveri2/start.bat) from Windows File Explorer or execute in Command Prompt:
```cmd
start.bat
```
*This script automatically initiates both the FastAPI backend and Vite frontend development servers in separate synchronized terminal windows.*

---

### Option B: Manual Multi-Terminal Launch

#### Terminal 1: FastAPI Backend Application Server
```powershell
# From project root:
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
- **Backend Base URL**: `http://127.0.0.1:8000`
- **Interactive Swagger Documentation**: `http://127.0.0.1:8000/docs`
- **ReDoc Documentation**: `http://127.0.0.1:8000/redoc`

#### Terminal 2: React Frontend Web Dashboard
```powershell
# From project root:
cd frontend
npm run dev
```
- **Dashboard URL**: `http://localhost:3000`

#### Terminal 3: Virtual Enterprise Lab Guest Daemons (Optional)
```powershell
# From project root:
.\.venv\Scripts\python.exe virtual-lab/run_local_virtual_nodes.py
```
*Emulates endpoints `ws-finance-01`, `srv-domain-01`, and `gw-edge-01` sending heartbeat telemetry and executing SOAR firewall blocks.*

---

## 4. Default Login Credentials

Access the dashboard at **[http://localhost:3000](http://localhost:3000)** and sign in:

| Role | Username | Password | Privileges |
| :--- | :--- | :--- | :--- |
| **SOC Admin** | `admin` | `Admin@SOC2026!` | Full administrative access, rule tuning, manual containment execution |
| **SOC Analyst** | `analyst` | `Analyst@SOC2026!` | Triage view, incident investigation, simulation dry-runs |

*(Quick-Fill buttons are embedded on the login page for convenience during evaluation).*

---

## 5. Post-Installation Verification & Testing

Verify that your local deployment is functioning with zero errors:

```powershell
# 1. Run all 16 backend unit & integration tests
.\.venv\Scripts\pytest.exe backend\tests -v

# 2. Run Phase 10 comprehensive acceptance verification suite
python scripts\phase10_acceptance_verification.py

# 3. Audit REST and WebSocket frontend-backend integration
python scripts\verify_frontend_backend_integration.py
```
*All 52 automated tests must report **100% PASS**.*

---

## 6. Message Broker Configuration: In-Memory vs. Apache Kafka

### In-Memory Queue (Default Mode)
- **Zero Configuration Required**: Uses Python's native `asyncio.Queue` and thread-safe ring buffer (`backend/app/services/event_queue.py`).
- **Ideal For**: Local testing, development workstations, and memory-constrained evaluation laptops.

### Apache Kafka Broker (Production Mode)
To connect to an external production Kafka broker:
1. Ensure Apache Kafka is running (`localhost:9092` or Confluent Cloud).
2. Install `aiokafka`:
   ```bash
   pip install aiokafka
   ```
3. Set environment variables in `.env`:
   ```ini
   QUEUE_TYPE=kafka
   KAFKA_BOOTSTRAP_SERVERS=localhost:9092
   KAFKA_TOPIC_TELEMETRY=telemetry.raw
   KAFKA_TOPIC_ALERTS=alerts.high
   ```
4. Restart the backend server. The ingestion service will automatically stream events to the Kafka cluster.

---

## 7. Troubleshooting & FAQs

| Symptom / Error | Root Cause | Solution |
| :--- | :--- | :--- |
| **PowerShell script execution disabled** | Windows security policy restricts execution of unsigned `.ps1` files | Run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`, then re-run `.\.venv\Scripts\Activate.ps1`. |
| **`python` opens Microsoft Store** | Windows default App Execution Aliases enabled | Navigate to *Windows Settings $\rightarrow$ Apps $\rightarrow$ Advanced app settings $\rightarrow$ App execution aliases* and toggle off **"Python"** and **"Python3"**. |
| **`npm` is not recognized as a command** | Node.js directory missing from system environment PATH | Install Node.js LTS from [nodejs.org](https://nodejs.org/) checking *"Add to PATH"*, or temporarily append path: `$env:PATH = "C:\Program Files\nodejs;$env:PATH"`. |
| **Port 8000 or 3000 already in use** | A dangling uvicorn or node process holds the TCP port | Identify and terminate process: `netstat -ano \| findstr :8000` followed by `taskkill /PID <PID> /F`. |
| **Scapy Packet Sniffing Permission Error** | Promiscuous packet capture requires administrator privileges or Npcap driver | Run PowerShell as Administrator. On Windows, install Npcap with *"WinPcap API-compatible Mode"*. On Linux run with `sudo`. |
| **Database Lock / SQLite Busy** | Concurrent writes on non-WAL SQLite database | Verify WAL mode is active: Run `sqlite3 soc_enterprise.db "PRAGMA journal_mode;"` (must return `wal`). |

