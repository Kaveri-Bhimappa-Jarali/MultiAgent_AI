# GENUINE VIRTUAL ENTERPRISE NETWORK LAB — DEPLOYMENT & ACCEPTANCE GUIDE

**Project:** Multi-Agent AI Security Operations Center (SOC) for Real-Time Threat Detection  
**Academic Specification:** SDMCET VII Sem CSE Major Project Synopsis (Sections 16–17)  
**File Location:** [`docs/GENUINE_VM_LAB_DEPLOYMENT_GUIDE.md`](file:///C:/Users/kaver/MultiAgent_AI/docs/GENUINE_VM_LAB_DEPLOYMENT_GUIDE.md)

---

## 1. Executive Summary & Hardware Requirements

The SDMCET Major Project Synopsis mandates a genuine virtualized enterprise network lab comprising three separate guest systems:
1. **Endpoint Workstation:** Debian/Ubuntu employee system (`192.168.56.10`)
2. **Internal Enterprise Server:** Debian/Ubuntu server hosting database backups and SSH services (`192.168.56.15`)
3. **Attacker / Testbed System:** Kali/Alpine system generating controlled, authorized attack scenarios (`192.168.56.20`)
4. **SOC Central Platform:** Host Windows machine running the FastAPI backend and React frontend (`192.168.56.1:8000`)

### Minimum Workstation Requirements for Hardware Kernel Virtualization
- **CPU:** AMD-V or Intel VT-x enabled in BIOS/UEFI.
- **Physical RAM:** Minimum **8.0 GB RAM** ($\ge 4.0\text{ GB}$ unallocated free physical memory).
- **Disk Space:** Minimum **20 GB free disk space** for base box images and virtual disk overlays.
- **Operating System Privileges:** Windows Administrator privileges (`Run as administrator` UAC prompt) for kernel NDIS6 network adapter driver installation.

---

## 2. Step-by-Step Deployment Runbook

### Step 1: Install Hypervisor & Tooling (PowerShell as Administrator)
Open an elevated PowerShell window (`Win + X` $\rightarrow$ *Terminal (Admin)*):

```powershell
# 1. Install Oracle VirtualBox 7.x
winget install Oracle.VirtualBox --exact --accept-package-agreements --accept-source-agreements

# 2. Install HashiCorp Vagrant
winget install HashiCorp.Vagrant --exact --accept-package-agreements --accept-source-agreements

# 3. Reboot system to load VBoxDrv.sys into Windows Kernel
Restart-Computer
```

---

### Step 2: Verify Host-Only Network Adapter
After reboot, verify the VirtualBox Host-Only Ethernet Adapter exists on subnet `192.168.56.1/24`:

```powershell
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" list hostonlyifs
```
If the adapter is missing, create it:
```powershell
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" hostonlyif create
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" hostonlyif ipconfig "VirtualBox Host-Only Ethernet Adapter" --ip 192.168.56.1 --netmask 255.255.255.0
```

---

### Step 3: Provision the 3 Isolated Guest VMs
Navigate to the `virtual-lab` workspace directory:

```powershell
cd C:\Users\kaver\MultiAgent_AI\virtual-lab

# Provision all 3 guests concurrently
vagrant up
```
*Vagrant will automatically download `generic/alpine319` (or `generic/debian12`), configure 512 MB RAM per machine, and assign static private IPs:*
- `vm-endpoint-01` $\rightarrow$ `192.168.56.10`
- `vm-server-01`   $\rightarrow$ `192.168.56.15`
- `vm-attacker-01` $\rightarrow$ `192.168.56.20`

Verify all 3 VMs are running:
```powershell
vagrant status
```

---

### Step 4: Start SOC Central Platform on Host
In a separate terminal, launch the SOC backend and frontend:

```powershell
# Terminal 1: Backend API & WebSocket Broadcaster
cd C:\Users\kaver\MultiAgent_AI
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000

# Terminal 2: React Dashboard
cd C:\Users\kaver\MultiAgent_AI\frontend
npm run dev
```

---

### Step 5: Start Guest Telemetry Collectors
Launch the native guest telemetry collector inside each machine:

```powershell
# Connect to Endpoint VM and start guest daemon
vagrant ssh endpoint -c "python3 /vagrant/guest-agent/vm_telemetry_collector.py --vm-id vm-endpoint-01 --host 192.168.56.1 --port 8000 --api-key VM-KEY-ENDPOINT-SEC-2026"

# Connect to Server VM and start guest daemon
vagrant ssh server -c "python3 /vagrant/guest-agent/vm_telemetry_collector.py --vm-id vm-server-01 --host 192.168.56.1 --port 8000 --api-key VM-KEY-SERVER-PROD-2026"
```
*Verify in the SOC Web Dashboard (`http://localhost:3000/virtual-lab`) that both nodes transition from `CONFIGURED` $\rightarrow$ `CONNECTED` $\rightarrow$ `RECEIVING_TELEMETRY`.*

---

### Step 6: Execute Controlled Attack Scenario
From the authorized attacker guest, generate multi-stage intrusion traffic:

```powershell
# 1. SSH Brute Force against Endpoint
vagrant ssh attacker -c "python3 /vagrant/attacker/attacker_toolkit.py --scenario brute_force --target 192.168.56.10"

# 2. Port Scan against Internal Server
vagrant ssh attacker -c "python3 /vagrant/attacker/attacker_toolkit.py --scenario port_scan --target 192.168.56.15"

# 3. Database Exfiltration Attempt
vagrant ssh attacker -c "python3 /vagrant/attacker/attacker_toolkit.py --scenario data_exfiltration --target 192.168.56.15"
```

---

### Step 7: Verify Real-Time Detection, Correlation & Containment
1. **Telemetry Ingress:** Event is transmitted over HTTP POST to `/api/v1/vm/telemetry`, flagged as `is_simulated=False` and `source_type="VM_ENDPOINT"`.
2. **Rule Detection:** `RULE-AUTH-001` triggers on 3 consecutive failed SSH attempts.
3. **Multi-Agent Orchestration:**
   - `AuthenticationAgent` analyzes authentication sequence.
   - `ThreatIntelligenceAgent` cross-references IP.
   - `CorrelationAgent` clusters multi-stage alerts into incident `INC-...`.
   - `RiskService` assigns mathematical score (e.g. 95/100).
   - `InvestigationAgent` generates 8-question Root Cause Analysis.
   - `AttackPathAgent` plots directed entity traversal graph.
4. **Defensive SOAR Containment:**
   - `ResponseAgent` recommends action `BLOCK_IP` (`192.168.56.20`).
   - SOC analyst approves via dashboard or API.
   - Guest collector on `vm-endpoint-01` polls `/api/v1/vm/actions/pending`, fetches command, and executes:
     ```bash
     iptables -I INPUT -s 192.168.56.20 -j DROP
     ```
   - Guest daemon reports `EXECUTED_ON_VM` back to backend.
5. **Evidence-Based Verification:**
   - Subsequent connection attempts from `192.168.56.20` are dropped at kernel level.
   - Verification engine confirms zero ongoing uncontained threats and transitions status to:
     **`ACTUAL_LAB_RESPONSE_VERIFIED`**.
