# KNOWN LIMITATIONS & ENVIRONMENTAL CONSTRAINTS

**Project:** Multi-Agent AI Security Operations Center (SOC) for Real-Time Threat Detection  
**Academic Specification:** SDMCET VII Sem CSE Major Project Synopsis (Sections 16–17)  
**Authors:** Deepak, Isha U Prabhu, Ishank Kumar, Kaveri Jarali | **Faculty Guide:** Dr. Rani Shetty  
**Updated:** 2026-11-01  

This document provides a transparent, technically detailed audit of the known limitations, environmental constraints, and architectural boundaries of the Multi-Agent AI SOC platform.

---

## 1. Hardware Virtualization & Three-VM Virtual Lab Constraint

### 1.1 Technical Constraint Description
The academic synopsis specifies an isolated virtual enterprise network lab comprising three separate virtual machines (`vm-endpoint-01: 192.168.56.10`, `vm-server-01: 192.168.56.15`, `vm-attacker-01: 192.168.56.20`).

On the current host development environment:
1. **Physical Host Memory:** The host Windows laptop has **5.89 GB visible physical RAM**, with only **~0.95 GB available free unallocated RAM**. Launching three full Linux kernel virtual machines (Endpoint: 1024 MB, Server: 1024 MB, Attacker: 512 MB $\implies 2.56\text{ GB}$ minimum allocation) would trigger extreme Windows pagefile thrashing, memory starvation, or kernel Out-Of-Memory (OOM) crashes.
2. **Missing Hypervisor Binaries:** Neither Oracle VirtualBox (`VBoxManage.exe`), VMware Workstation (`vmrun.exe`), nor HashiCorp Vagrant (`vagrant.exe`) is installed in PATH or standard program directories.
3. **Privilege Boundary:** Installing kernel-level hypervisor drivers (e.g. `VBoxDrv.sys`, NDIS6 network bridge adapters) requires Windows Administrator elevation (`Run as administrator` UAC token) and a system reboot, which is unavailable in the current non-elevated user context.

### 1.2 Status & Academic Honesty Verdict
- **Status:** **BLOCKED BY ENVIRONMENT**.
- In accordance with academic integrity standards, the project **does not claim hardware kernel VM execution** on this machine.

### 1.3 Verified Workaround & Demonstration
- The codebase provides [`virtual-lab/run_local_virtual_nodes.py`](file:///c:/Users/kaver/MultiAgent_AI/virtual-lab/run_local_virtual_nodes.py), which runs the three guest collector daemons as separate local processes with independent token authentication, offline buffering, and system metrics reporting to the SOC backend API.
- All provisioning scripts, network definitions, and provisioning configurations are verified in [`virtual-lab/Vagrantfile`](file:///c:/Users/kaver/MultiAgent_AI/virtual-lab/Vagrantfile).

### 1.4 Workstation Requirements for Full Three-VM Lab
To launch the genuine 3-VM virtual lab, deploy on a workstation with:
- **RAM:** Minimum **8 GB RAM** (Recommended: **16 GB RAM**).
- **CPU:** AMD-V or Intel VT-x enabled in BIOS/UEFI.
- **Disk:** $\ge 20\text{ GB}$ free disk space.
- **Privileges:** Windows Administrator / Linux root access for hypervisor installation.
- Follow the instructions in [`docs/GENUINE_VM_LAB_DEPLOYMENT_GUIDE.md`](file:///c:/Users/kaver/MultiAgent_AI/docs/GENUINE_VM_LAB_DEPLOYMENT_GUIDE.md).

---

## 2. Actual Guest Firewall Containment vs Simulated Dry-Run

### 2.1 Technical Constraint Description
In a full production or genuine VM environment, containment actions (such as `BLOCK_IP` or `ISOLATE_HOST`) execute actual `iptables` or `nftables` kernel packet-filter rules on the guest operating system.

Because hardware Linux kernel VMs cannot run on the current host:
- Response actions dispatched to local simulated nodes execute in **`DRY_RUN` or simulated mode**.
- Post-containment verification evaluates simulated dropped packets or subsequent telemetry observation windows, reaching `SIMULATED_RESPONSE_VERIFIED` rather than `ACTUAL_LAB_RESPONSE_VERIFIED`.

### 2.2 Mitigation
- The response engine strictly distinguishes between:
  - `DRY_RUN`: Verified simulation without firewall modification.
  - `SIMULATED_RESPONSE_VERIFIED`: Verification based on simulated dropped packet streams.
  - `ACTUAL_LAB_RESPONSE_VERIFIED`: Verification based on genuine VM iptables packet drops.
- Both workflows share identical approval gates, audit logging, and rollback mechanics.

---

## 3. Dataset Storage & GitHub File Size Boundaries

### 3.1 Technical Constraint Description
The genuine benchmark datasets used for training are:
- `UNSW_NB15_training-set.csv`: 14.59 MB (82,332 records)
- `Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv`: 73.34 MB (286,467 records)

GitHub enforces a 50 MB warning threshold and a 100 MB hard limit on individual files in Git repositories. Pushing the uncompressed 73.34 MB CICIDS2017 CSV directly without Git LFS would trigger GitHub repository warnings.

### 3.2 Mitigation
- `data/raw/*/*.csv` is excluded in [`.gitignore`](file:///c:/Users/kaver/MultiAgent_AI/.gitignore).
- Directory structure is tracked via `.gitkeep` markers.
- Datasets are automatically acquired and verified using the automated downloader:
  ```powershell
  python scripts/download_datasets.py
  ```
- Official schemas in [`data/schemas/`](file:///c:/Users/kaver/MultiAgent_AI/data/schemas) and pre-trained model artifacts in [`artifacts/models/`](file:///c:/Users/kaver/MultiAgent_AI/artifacts/models) are tracked directly in Git, allowing immediate out-of-the-box inference without requiring dataset re-downloads.

---

## 4. TestClient Socketpair Sandbox Behavior on Windows

### 4.1 Technical Constraint Description
In Python on Windows inside standard isolated execution sandboxes, Starlette's `TestClient` (backed by AnyIO) initializes an event loop portal thread that creates a loopback TCP socketpair (`socket.socketpair()`). If local loopback networking is restricted, `lsock.accept()` blocks.

### 4.2 Mitigation
- Integration tests exercising Starlette `TestClient` against live WebSockets and REST APIs are run with loopback network permissions permitted (`BypassSandbox: true`).
- Standard unit tests in `pytest backend/tests -v` operate directly on the SQLite database and services without loopback socket requirements.

---

## 5. Storage Scalability & Database Engine

### 5.1 Technical Constraint Description
The default configuration uses SQLite with Write-Ahead Logging (WAL) and foreign key constraints enabled. While SQLite WAL easily supports hundreds of events per second with read-write concurrency:
- High-throughput enterprise deployments exceeding $\ge 10,000$ events per second require a distributed message broker and database.

### 5.2 Enterprise Production Upgrade Path
- **Message Ingress:** Replace the in-memory `RealtimeEventQueue` with an Apache Kafka or Redis Streams broker.
- **Database:** Set `DATABASE_URL=postgresql://user:password@host:5432/soc_db` in `.env` (PostgreSQL is natively supported via SQLAlchemy).
- **Time-Series Ingestion:** Use TimescaleDB or ClickHouse for long-term historical event storage.
