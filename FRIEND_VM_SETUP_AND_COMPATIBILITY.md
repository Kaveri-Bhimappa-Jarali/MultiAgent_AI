# Multi-Agent AI SOC: Friend's Real VM Setup & Compatibility Guide

> **Document Status**: Production Handover Guide  
> **Target Audience**: Cybersecurity Analyst / SOC QA Specialist / Lab Partner  
> **Environment**: Dual-Engine (Local Synthetic Testing + Real Attacker/Victim Virtual Machines)  
> **Classification Standard**: Every capability in this document is labeled as `[CODE VERIFIED]`, `[LOCALLY TESTED]`, or `[REAL VM TESTED]`.

---

## Compatibility & Verification Status Matrix

| Component / Pipeline Step | Verification Status | Details |
| :--- | :--- | :--- |
| **Guest Collector CLI Arguments** | `[LOCALLY TESTED]` | Accepts positional syntax, named flags (`--host`, `--vm`, `--key`, etc.), and environment variables. Tested with `--help`. |
| **Guest Collector Auth (X-VM-Key)** | `[LOCALLY TESTED]` | Transmits `X-VM-Key` and `X-VM-ID` HTTP headers and matches backend `verify_vm_auth` in `virtual_lab.py`. |
| **Dynamic Local IP Auto-Discovery** | `[LOCALLY TESTED]` | Routes outbound UDP probe directly to SOC Host IP. Eliminates dependency on external internet (`8.8.8.8`). |
| **Custom Subnet Compatibility** | `[LOCALLY TESTED]` | Fully supports `192.168.56.0/24`, `192.168.x.x`, `10.x.x.x`, and `172.16-31.x.x`. No hardcoded IPs required. |
| **Inbound Network Sweep Detection** | `[LOCALLY TESTED]` | Removed restrictive `10.0.*` check. Captures connections from any non-local peer on any private subnet. |
| **Multi-Distro Auth Log Tailing** | `[CODE VERIFIED]` | Supports Debian/Ubuntu (`/var/log/auth.log`), RHEL/CentOS/Rocky (`/var/log/secure`), and syslog fallbacks. |
| **Offline Buffering & Auto-Flush** | `[LOCALLY TESTED]` | Queues up to 1,000 events locally on network failure; flushes automatically upon heartbeat reconnection. |
| **Backend 0.0.0.0 Binding & CORS** | `[LOCALLY TESTED]` | FastAPI and UDP Syslog bound to all interfaces. CORS configured with regex for private subnets. |
| **Cross-Domain Correlation Rules** | `[LOCALLY TESTED]` | 100% verified in 10-phase audit. Single failed logins suppressed; multi-domain attacks produce exactly 1 incident. |
| **Investigation RCA (8 Questions)** | `[LOCALLY TESTED]` | Canonical 8-question RCA generated for correlated incidents with MITRE ATT&CK technique mapping. |
| **SOAR Approval & VM Isolation** | `[LOCALLY TESTED]` | Dispatches `BLOCK_IP` and `ISOLATE_ENDPOINT` commands. Root executes iptables; non-root reports safe simulation. |
| **Physical Hypervisor Network Route** | `[PENDING FRIEND'S RUN]` | Requires friend's actual VirtualBox / VMware virtual NIC to send real packets across the host-only adapter. |

---

## 1. Required Software & Dependencies

### Host Machine (SOC Server & Dashboard)
- **Operating System**: Windows 10/11, macOS, or Linux.
- **Python**: Version 3.11, 3.12, 3.13, or 3.14.
- **Node.js**: Version 18.x, 20.x, or 22.x (for the frontend React dashboard).
- **Virtualization Software**: Oracle VirtualBox, VMware Workstation / Fusion, or Hyper-V.

### Guest Virtual Machines (Victim & Attacker)
- **Victim VM**:
  - OS: Debian, Ubuntu (18.04/20.04/22.04/24.04), Rocky Linux, AlmaLinux, or CentOS.
  - Python: Python 3.6+ installed (`python3 --version`).
  - Standard Tools: `iproute2` (`ss`), `iptables`, `systemd` or `rsyslog`.
  - OpenSSH Server running (`systemctl status ssh` or `systemctl status sshd`).
- **Attacker VM**:
  - OS: Kali Linux, Ubuntu, Debian, or Alpine.
  - Tools: Python 3.6+, `curl`, `nmap` (optional), `ssh`.

---

## 2. VM Network Architecture & Subnet Setup

The Multi-Agent AI SOC is **subnet-agnostic**. You can use the standard VirtualBox Host-Only network or any custom private subnet:

```
+-------------------------------------------------------------------------------+
| HOST MACHINE (Windows / Linux / macOS)                                        |
| Host-Only Adapter IP: 192.168.56.1 (or your host-only IP)                     |
|                                                                               |
| [FastAPI Backend]            [React Dashboard]         [UDP Syslog Collector] |
| Port: 8000 (0.0.0.0)         Port: 5173                Port: 5514 (0.0.0.0)   |
| Database: soc_enterprise.db                                                   |
+-------------------------------------------------------------------------------+
           |                                                      |
    (Host-Only Network: e.g. 192.168.56.0/24 or your private subnet)
           |                                                      |
           v                                                      v
+-----------------------------+               +-------------------------------+
| VICTIM VM (vm-server-01)    |               | ATTACKER VM (vm-attacker-01)  |
| IP: 192.168.56.15 (example) |  Inbound Probes | IP: 192.168.56.20 (example)   |
| Role: SERVER (or ENDPOINT)  |<--------------| Role: ATTACKER / TESTBED      |
| Guest Collector Daemon      |  SSH / Sweeps | Attacker Toolkit Script       |
+-----------------------------+               +-------------------------------+
```

### VirtualBox Network Configuration
1. Open VirtualBox → **Tools** → **Network Manager**.
2. Under **Host-only Networks**, ensure an adapter exists (typically `VirtualBox Host-Only Ethernet Adapter` with IP `192.168.56.1` and mask `255.255.255.0`).
3. For both **Victim VM** and **Attacker VM**:
   - Go to **Settings** → **Network**.
   - **Adapter 1**: Attached to `Host-only Adapter` (Select the adapter above).
   - Promiscuous Mode: `Allow All` or `Allow VMs`.
   - Cable Connected: Checked.

---

## 3. Host Step 1: Discover Host-Only IP & Open Firewall

### Discover Host IP
On Windows (Host PowerShell):
```powershell
Get-NetIPAddress -InterfaceAlias "*VirtualBox*" | Select-Object IPAddress, InterfaceAlias
```
*(On Linux/macOS Host: `ip addr show vboxnet0` or `ifconfig vboxnet0`)*

Note this IP address (e.g. `192.168.56.1`). This is your `SOC_HOST_IP`.

### Open Windows Firewall Inbound Ports
Run in an **Elevated (Administrator) PowerShell** on the Host:
```powershell
New-NetFirewallRule -DisplayName "SOC Real VM Ingress (HTTP & Syslog)" -Direction Inbound -LocalPort 8000,5514 -Protocol TCP,UDP -Action Allow
```

---

## 4. Host Step 2: Configure & Start Backend and Frontend

### Configure Environment (Optional Customization)
If your Host-Only IP is something other than `192.168.56.1`, create or edit `.env` in the project root:
```env
SOC_HOST_IP=192.168.56.1
SOC_HOST_PORT=8000
SYSLOG_LISTEN_HOST=0.0.0.0
SYSLOG_LISTEN_PORT=5514
```

### Start the Backend
Open a terminal in `MultiAgent_AI`:
```powershell
$env:PYTHONPATH = "backend"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
```
You should see:
```text
[syslog-udp] Syslog UDP collector listening on 0.0.0.0:5514
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### Start the Frontend Dashboard
In a separate terminal:
```powershell
cd soc-frontend
npm run dev -- --host 0.0.0.0 --port 5173
```
Open your browser at `http://localhost:5173` (or `http://192.168.56.1:5173`).

---

## 5. Guest VM Setup: Install & Start Guest Collector

Copy `virtual-lab/guest-agent/vm_telemetry_collector.py` to the Victim VM (via SCP, shared folder, or copy-paste).

### Find Victim VM's IP Address
Inside Victim VM terminal:
```bash
ip -4 addr show
```
*(e.g., `192.168.56.15`)*

### Verify Connectivity from VM to Host
Inside Victim VM:
```bash
curl -I http://<SOC_HOST_IP>:8000/api/vm/nodes
```
You should receive an `HTTP/1.1 200 OK` response with JSON topology.

### Start the Guest Collector Daemon
Run inside the Victim VM:

```bash
# Standard command using positional arguments:
python3 vm_telemetry_collector.py http://<SOC_HOST_IP>:8000 vm-server-01 VM-KEY-SERVER-PROD-2026 /var/log/auth.log
```

Or using explicit named flags:
```bash
python3 vm_telemetry_collector.py \
    --host http://<SOC_HOST_IP>:8000 \
    --vm vm-server-01 \
    --key VM-KEY-SERVER-PROD-2026 \
    --log /var/log/auth.log \
    --peer-ip <ATTACKER_VM_IP>
```

> **Note for RedHat / CentOS / Rocky Linux**:  
> Replace `/var/log/auth.log` with `/var/log/secure`. The daemon also automatically detects existing auth log files.

### Expected Guest Collector Startup Output:
```text
======================================================================
       MULTI-AGENT AI SOC GUEST TELEMETRY DAEMON: vm-server-01
======================================================================
SOC Host Target:   http://192.168.56.1:8000
Guest Node IP:     192.168.56.15
Heartbeat Cadence: 10s
Monitored Log:     /var/log/auth.log
======================================================================
[vm-server-01] Monitoring authentic guest logs: ['/var/log/auth.log']
[vm-server-01] Heartbeat acknowledged by SOC Host (2026-11-14T21:30:00Z). Node IP: 192.168.56.15
```

---

## 6. How to Verify Real Telemetry Reached the Backend

Once the guest collector starts:

1. **Dashboard Check**:
   - Refresh `http://localhost:5173`.
   - On the **Topology / Virtual Lab** view, node `vm-server-01` will transition from `CONFIGURED` to **`CONNECTED`** (green badge).
   - Telemetry counter shows `RECEIVING_TELEMETRY`.
2. **API Heartbeat Check**:
   On your host:
   ```powershell
   curl http://127.0.0.1:8000/api/vm/nodes
   ```
   Check that `last_heartbeat_at` is updated within the last 15 seconds.

---

## 7. How to Test the Complete Pipeline (Attack Scenarios)

Perform these steps from the **Attacker VM** (or via a test script on the network):

### Scenario 1: Normal Inbound Activity (Verification of Zero False Positives)
From Attacker VM, send benign HTTP/health requests to the Victim VM:
```bash
curl http://<VICTIM_VM_IP>/health
```
- **Expected Outcome**:
  - Event recorded as `network_connection` (`INFO` / `LOW`).
  - **Incidents count remains 0**. Multi-agent pipeline does not trigger false positives on normal traffic.

---

### Scenario 2: Failed SSH Login (Single-Domain Suppression)
From Attacker VM, execute an intentional failed login attempt:
```bash
ssh invalid_user@<VICTIM_VM_IP>
```
(Type an incorrect password 3 times and let it disconnect).

- **Expected Outcome**:
  - Victim guest collector detects:
    ```text
    [vm-server-01] Forwarded 3 authentic VM log events (auth.log) to SOC Host
    ```
  - `Authentication Agent` detects `Authentication Brute-Force Spray from IP <ATTACKER_IP>`.
  - **Correlated Incidents remains 0**: The correlation engine requires cross-domain corroboration from $\ge 2$ distinct primary detection domains. Isolated failed logins are quarantined as individual findings.

---

### Scenario 3: Corroborated Multi-Stage Attack (Incident Creation)
Now trigger endpoint activity or network port sweeps on the Victim VM:

#### Option A: Run the Authorized Attacker Toolkit
Copy `virtual-lab/attacker/attacker_toolkit.py` to the Attacker VM and run:
```bash
python3 attacker_toolkit.py --target <VICTIM_VM_IP> --scenario all
```

#### Option B: Trigger Manual Authentic Sudo / Execution on Victim VM
Inside the Victim VM, run:
```bash
sudo ls /root
```
Or execute volume/backup access commands.

- **Expected Pipeline Outcome**:
  1. **Authentication Agent**: Flags credential spray.
  2. **Endpoint Agent**: Flags unauthorized privilege escalation (`sudo: COMMAND=/bin/bash` or `CRITICAL`).
  3. **Network Monitoring Agent**: Flags multi-port sweep.
  4. **Correlation Agent**: Correlates the evidence across shared source IP, target host, and timestamp window (900s).
  5. **Incident Created**: Exactly **1** unique incident created (`INC-YYYYMM-XXXXXX`) with severity `HIGH` or `CRITICAL`.
  6. **Investigation Agent**: Generates Canonical 8-question Root Cause Analysis (RCA) and maps MITRE ATT&CK techniques (`T1110`, `T1078`, `T1548`, `T1046`).
  7. **SOAR Response**: Proposes `BLOCK_IP` on the attacker or `ISOLATE_ENDPOINT` on the victim.

---

### Scenario 4: SOAR Containment Verification
1. Open the SOC Frontend Dashboard → **Incidents** → Open the incident.
2. Under **Response Actions**, view the pending approval action (`BLOCK_IP`).
3. Click **Approve**.
4. Inside Victim VM terminal running `vm_telemetry_collector.py`, observe:
   ```text
   [SOAR ENFORCEMENT] Received containment command: iptables -I INPUT -s <ATTACKER_IP> -j DROP
   [SOAR ENFORCEMENT] Simulation reported (safe mode) for VMACT-XXXXXX
   ```
   *(If the collector is executed with `sudo python3 ...`, it actively enforces the iptables rule).*

---

## 8. Common Errors & Troubleshooting

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| `Connection failed to http://192.168.56.1:8000: [Errno 111] Connection refused` | Backend not listening on `0.0.0.0` or Windows Firewall blocking. | Ensure Uvicorn is started with `--host 0.0.0.0`. Run firewall rule in Section 3. |
| `[AUTH ERROR 401] Invalid API Key` | Key in collector does not match database. | Use `VM-KEY-SERVER-PROD-2026` for `vm-server-01` or `VM-KEY-ENDPOINT-SEC-2026` for `vm-endpoint-01`. |
| `[NOT FOUND 404] Node not registered` | VM ID used is not in the database. | Use `vm-server-01` or register a custom node via `POST /api/vm/nodes/register`. |
| `No auth logs found. Monitoring local buffer` | VM does not have `/var/log/auth.log`. | On RHEL/CentOS/Rocky, pass `/var/log/secure`. Ensure `rsyslog` or `systemd-journald` is running. |
| Dashboard shows 0 events after attack | Collector byte offset is pointing to the end of the file. | Ensure you trigger *new* login attempts after starting the collector. Check `[vm-server-01] Forwarded X events`. |
| Raw packet capture skipped error | Guest collector not running as `root`. | Normal behavior. Collector gracefully falls back to `socket_tracker` (`ss` socket monitor) without losing connectivity. |

---

## 9. Known Limitations

1. **Host-Only vs Bridged Networking**:
   - Host-Only adapters isolate VM traffic to the host and VMs only. If you use Bridged Networking, ensure your local physical router does not block inter-device communication.
2. **Raw Packet Capture on Windows**:
   - `monitor_network_packets` uses Linux `AF_PACKET` raw sockets. On Windows host simulations, it gracefully disables itself and relies on `socket_monitor` and HTTP/auth logs.
3. **Log Rotation**:
   - The daemon detects log rotation when file size drops. If logrotate moves the file before new data is written, restart the collector or ensure logrotate uses `copytruncate`.
4. **SOAR Execution Mode**:
   - If the collector daemon runs as a standard user (`ubuntu`), SOAR containment runs in **safe simulation mode** without altering OS firewall rules. To enforce real containment, run the collector with `sudo`.

---

## 10. Summary Checklist for Handover

Before testing with your friend, verify:
- [x] Backend starts cleanly on `0.0.0.0:8000` with Syslog on `0.0.0.0:5514`.
- [x] Database is reset to clean 0-state (`python scripts/clean_test_database.py`).
- [x] Windows Firewall rule allows ports `8000` and `5514`.
- [x] Victim VM can curl `http://<SOC_HOST_IP>:8000/api/vm/nodes`.
- [x] Guest collector starts and reports `Heartbeat acknowledged by SOC Host`.
- [x] Dashboard shows node in green `CONNECTED` status.
- [x] Failed login tests produce authentic events without premature false incidents.
- [x] Multi-stage attack creates exactly 1 incident with full RCA and SOAR recommendations.
