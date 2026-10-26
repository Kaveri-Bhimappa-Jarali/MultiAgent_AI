# Virtual Enterprise Network Architecture & Lab Topology

**Academic Specification Reference:** Major Project Synopsis (VII Sem CSE, SDM College of Engineering & Technology), Sections 16–17.

---

## 1. Enterprise Network Lab Topology

The virtualized enterprise network is hosted within an isolated private network segment (`192.168.56.0/24`) using Oracle VirtualBox / Vagrant or isolated guest nodes:

```
                            ┌────────────────────────────────────────┐
                            │               SOC HOST                 │
                            │           Windows 11 Host              │
                            │           IP: 192.168.56.1             │
                            │                                        │
                            │   • React SOC Command Center (3000)    │
                            │   • FastAPI SOC Core API (8000)        │
                            │   • 10 Specialized AI Agents           │
                            │   • Dual Threat Detection (Rules + ML) │
                            │   • Real-Time WebSockets (/api/ws)     │
                            └───────────────────▲────────────────────┘
                                                │
                 Telemetry Ingress & Heartbeats │ SOAR Containment (iptables)
                                                │
         ═══════════════════════════════════════╪═══════════════════════════════════════
                 ISOLATED PRIVATE VIRTUAL NETWORK (192.168.56.0/24)
         ═══════════════════════════════════════╪═══════════════════════════════════════
                    │                           │                           │
                    │                           │                           │
    ┌───────────────▼──────────────┐ ┌──────────▼─────────────────┐ ┌───────▼────────────────┐
    │       ENDPOINT VM            │ │        SERVER VM           │ │      ATTACKER VM       │
    │   Employee Workstation       │ │    Internal Enterprise     │ │   Security Testbed     │
    │   IP: 192.168.56.10          │ │    IP: 192.168.56.15       │ │   IP: 192.168.56.20    │
    │   RAM: 512 MB                │ │    RAM: 512 MB             │ │   RAM: 512 MB          │
    │   OS: Debian/Ubuntu/Alpine   │ │    OS: Debian Server       │ │   OS: Kali/Alpine      │
    │                              │ │                            │ │                        │
    │ • User: sarah.connor         │ │ • User: vikram.sharma      │ │ • Tools: Nmap, SSH     │
    │ • /var/log/auth.log          │ │ • /var/log/auth.log        │ │   brute-force toolkit  │
    │ • Sudo command tracking      │ │ • /var/backups/db.sql      │ │ • Target: .10 & .15    │
    │ • VM Telemetry Agent         │ │ • VM Telemetry Agent       │ │ • NO public bridge     │
    └──────────────────────────────┘ └────────────────────────────┘ └────────────────────────┘
```

---

## 2. IP Addressing & Component Roles

| System Node | Role | Assigned Subnet IP | Guest Log Sources & Capabilities | Host Memory Required |
|---|---|---|---|---|
| **SOC Host** | Command Center & Analysis Engine | `192.168.56.1` | React Dashboard, FastAPI, 10 Agents, SQLite WAL, WebSockets | Native Host |
| **Endpoint VM** | User Workstation (`vm-endpoint-01`) | `192.168.56.10` | `/var/log/auth.log`, Sudo executions, Process tables | 512 MB |
| **Server VM** | Enterprise Core Server (`vm-server-01`) | `192.168.56.15` | SSH daemon, `/var/backups/customers_backup.sql`, Network connections | 512 MB |
| **Attacker VM** | Testbed Attack Node (`vm-attacker-01`) | `192.168.56.20` | TCP SYN sweeps, SSH authentication bursts, kill-chain simulation | 512 MB |

> **Resource Optimization Note:** By utilizing lightweight Linux distributions (such as Alpine Linux or minimal Debian), the entire 3-VM virtual network consumes only **~1.5 GB of RAM in total**, operating comfortably within host hardware limits (6 GB RAM).

---

## 3. Network Isolation Guarantee
- **Host-Only Networking:** The lab network utilizes VirtualBox `Host-Only Ethernet Adapter` (`vboxnet0` or `192.168.56.0/24`).
- **Safety Protocol:** The Attacker VM is **strictly isolated** from the host's physical network adapter and public internet. All offensive activity is directed exclusively at designated lab targets (`192.168.56.10` and `192.168.56.15`).

---

## 4. End-to-End Workflow Demonstration

1. **Attack Execution:** Attacker VM initiates controlled test activity (e.g., SSH brute force against Server VM).
2. **Guest Observation:** Server VM receives incoming TCP connections; OpenSSH logs repeated authentication failures in `/var/log/auth.log`.
3. **Telemetry Ingress:** The `vm_telemetry_collector.py` daemon on Server VM parses the log line and POSTs authentic telemetry to `http://192.168.56.1:8000/api/vm/telemetry`.
4. **Real-Time Detection:** SOC backend enqueues the event, evaluates rolling window rule `RULE-AUTH-001`, and triggers `AuthenticationAgent`.
5. **Correlation & RCA:** `CorrelationAgent` links the events into a Critical Incident, `AttackPathAgent` maps `192.168.56.20 → Server VM`, and `InvestigationAgent` produces the 8-question Root Cause Analysis.
6. **SOAR Containment:** `ResponseAgent` recommends `IPTABLES_BLOCK_IP` for `192.168.56.20`.
7. **VM Execution & Verification:** The guest daemon polls the action, applies `iptables -A INPUT -s 192.168.56.20 -j DROP`, reports completion, and the verification engine confirms containment.
