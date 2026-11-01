# 3-VM Virtual Lab Acceptance & Environmental Audit Report

**Project:** Multi-Agent AI Security Operations Center (SOC) for Real-Time Threat Detection  
**Academic Reference:** SDMCET VII Semester Major Project Synopsis (Sections 16–17)  
**Host Machine:** Windows 11 Home / Pro (`C:\Users\kaver\MultiAgent_AI`)  
**Audit Date:** 2026-11-01  
**Audit Status:** **BLOCKED ON CURRENT HOST (ENVIRONMENT CONSTRAINED)** | **VERIFIED COMPLETE (CODEBASE & LOCAL PROCESS DAEMONS)**

---

## 1. Executive Summary & Academic Specification

The academic synopsis mandates a virtualized enterprise network lab comprising three isolated guest nodes:
1. `vm-endpoint-01`: Endpoint workstation (`192.168.56.10`)
2. `vm-server-01`: Enterprise internal server (`192.168.56.15`)
3. `vm-attacker-01`: Controlled attack simulation testbed (`192.168.56.20`)
4. Host SOC Controller: FastAPI backend and React frontend (`192.168.56.1:8000`)

### Final Acceptance Verdict
| Component | Status | Evidence / Technical Reason |
| :--- | :---: | :--- |
| **Vagrantfile & VM Provisioning Configuration** | **VERIFIED COMPLETE** | [`virtual-lab/Vagrantfile`](file:///c:/Users/kaver/MultiAgent_AI/virtual-lab/Vagrantfile) defines all 3 nodes on `192.168.56.0/24` with memory allocations (1024MB/1024MB/512MB). |
| **Guest Telemetry Collector Daemon** | **VERIFIED COMPLETE** | [`virtual-lab/guest-agent/vm_telemetry_collector.py`](file:///c:/Users/kaver/MultiAgent_AI/virtual-lab/guest-agent/vm_telemetry_collector.py) implements token auth, offline JSON buffering, exponential retry, and system metrics. |
| **Controlled Attacker Toolkit** | **VERIFIED COMPLETE** | [`virtual-lab/attacker/attacker_toolkit.py`](file:///c:/Users/kaver/MultiAgent_AI/virtual-lab/attacker/attacker_toolkit.py) strictly validates lab subnets (`192.168.56.0/24`), blocking external scans. |
| **Backend Virtual Lab REST API** | **VERIFIED COMPLETE** | [`backend/app/api/virtual_lab.py`](file:///c:/Users/kaver/MultiAgent_AI/backend/app/api/virtual_lab.py) manages heartbeats, pending actions, and telemetry ingestion with key verification. |
| **Multi-Process Local Runner Fallback** | **VERIFIED COMPLETE** | [`virtual-lab/run_local_virtual_nodes.py`](file:///c:/Users/kaver/MultiAgent_AI/virtual-lab/run_local_virtual_nodes.py) runs 3 independent background agent daemons with separate state. |
| **Hardware Kernel VM Execution on Current Host** | **BLOCKED** | Host has **5.89 GB RAM total**, **~0.95 GB free RAM**, unprivileged user context, and no hypervisor (`VBoxManage` / `vmrun`) installed. |

---

## 2. Host Environmental Audit

An automated diagnostic probe (`scripts/check_host_virtualization.ps1` and `scripts/phase10_acceptance_verification.py`) audited the physical Windows host:

```text
[CHECK 1] Host Virtualization & Memory Audit:
  • Physical Processor: AMD64 Architecture (AMD-V Enabled in BIOS)
  • Visible Physical Memory: 5.89 GB (6,036 MB)
  • Available Free RAM: ~0.95 GB (974 MB)
  • Oracle VirtualBox installed: False (VBoxManage not in PATH or Program Files)
  • VMware Workstation installed: False (vmrun not in PATH)
  • HashiCorp Vagrant installed: False (vagrant CLI not found)
  • Process Elevation: Standard Non-Administrator User Token
```

### Technical Root Cause of Blocker
1. **Hypervisor Prerequisite:** Oracle VirtualBox requires administrative privileges during installation to install kernel NDIS6 filter drivers and bind host-only network adapters (`vboxnet0`).
2. **Physical Memory Exhaustion:** Running three full guest Linux kernels (Endpoint: 1024 MB, Server: 1024 MB, Attacker: 512 MB $\implies 2.56\text{ GB}$ minimum) on a machine with only $0.95\text{ GB}$ available free memory would trigger extreme Windows pagefile thrashing or kernel Out-Of-Memory (OOM) crashes.
3. **Honest Reporting:** In accordance with academic honesty guidelines, the system **explicitly refuses to claim fake VM execution** while hypervisors are missing.

---

## 3. Verified Implementations & Reproducibility

### A. Vagrantfile Architecture
The complete automated provisioning configuration is located at [`virtual-lab/Vagrantfile`](file:///c:/Users/kaver/MultiAgent_AI/virtual-lab/Vagrantfile). It configures:
- Isolated Host-Only Network: `192.168.56.0/24`
- Guest 1: `vm-endpoint-01` (`192.168.56.10`, Ubuntu 22.04 LTS, 1024 MB RAM)
- Guest 2: `vm-server-01` (`192.168.56.15`, Debian 12, 1024 MB RAM)
- Guest 3: `vm-attacker-01` (`192.168.56.20`, Alpine Linux / Kali, 512 MB RAM)

### B. Guest Telemetry Collector Architecture
Located at [`virtual-lab/guest-agent/vm_telemetry_collector.py`](file:///c:/Users/kaver/MultiAgent_AI/virtual-lab/guest-agent/vm_telemetry_collector.py):
- **Authentication:** Ingests events and heartbeats using `X-VM-Key` and `api_key` headers validated against the database.
- **Offline Buffering:** If the SOC controller backend is offline or unreachable, events are written to `.offline_buffer_{vm_id}.json` and flushed in FIFO order upon reconnect.
- **Privacy & Safety:** Strips credentials, passwords, and authorization tokens matching `(?i)(password|secret|key|token)=([^\s&]+)` with `***REDACTED***`.
- **System Metrics:** Collects actual CPU utilization, memory percentage, and disk usage via `psutil`.

### C. Controlled Attacker Toolkit Safety
Located at [`virtual-lab/attacker/attacker_toolkit.py`](file:///c:/Users/kaver/MultiAgent_AI/virtual-lab/attacker/attacker_toolkit.py):
- **Safety Enforcement:** The `validate_lab_target()` function strictly bounds all scan and exploit commands to `192.168.56.0/24` and `127.0.0.1`. Any public, WAN, or unauthorized IP is rejected with `PermissionError: Target IP is outside authorized lab subnet`.
- **Scenarios Supported:**
  - `brute_force`: Controlled SSH failed password bursts against `192.168.56.15`.
  - `port_scan`: SYN/TCP connect scan across ports 21, 22, 80, 443, 3306, 8080.
  - `priv_esc`: Execution of suspicious sudo and shell invocation scripts.
  - `data_exfil`: Simulation of staged file transfers to lab test endpoints.

### D. Local Multi-Process Guest Daemon Runner
For demonstration and automated acceptance testing without hypervisor overhead, [`virtual-lab/run_local_virtual_nodes.py`](file:///c:/Users/kaver/MultiAgent_AI/virtual-lab/run_local_virtual_nodes.py) runs all 3 guest agent collectors as separate background daemons:
- Starts `vm-endpoint-01` collector daemon.
- Starts `vm-server-01` collector daemon.
- Starts `vm-attacker-01` scenario controller.
- Verified in backend tests: `backend/tests/test_virtual_lab.py` (100% PASS).

---

## 4. Hardware Lab Deployment Guide

To deploy the full hardware VM environment on a workstation meeting the recommended hardware requirements ($\ge 16\text{ GB RAM}$, Administrator UAC):
1. Install VirtualBox and Vagrant:
   ```powershell
   winget install Oracle.VirtualBox HashiCorp.Vagrant
   Restart-Computer
   ```
2. Navigate to `virtual-lab` and launch:
   ```bash
   cd virtual-lab
   vagrant up
   ```
3. Verify running virtual machines:
   ```bash
   vagrant status
   ```
4. Follow the comprehensive instructions in [`docs/GENUINE_VM_LAB_DEPLOYMENT_GUIDE.md`](file:///c:/Users/kaver/MultiAgent_AI/docs/GENUINE_VM_LAB_DEPLOYMENT_GUIDE.md).
