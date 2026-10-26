# Virtual Lab Controlled Attack Scenarios & Validation Guide

All activities described in this document are strictly authorized, benign security tests executed within the isolated lab subnet (`192.168.56.0/24`).

---

## Scenario A: SSH Authentication Brute-Force Attack

### 1. Goal
Simulate an external attacker attempting rapid credential stuffing against the Server VM (`192.168.56.15`).

### 2. Execution from Attacker VM (`192.168.56.20`):
```bash
python3 attacker_toolkit.py --target 192.168.56.15 --scenario brute_force --port 22
```

### 3. Expected Telemetry & SOC Detection:
- Server VM OpenSSH generates 4 failed password attempts for user `sarah.connor`.
- Guest daemon forwards events to `/api/vm/telemetry`.
- SOC rolling-window rule `RULE-AUTH-001` triggers.
- **Authentication Agent** analyzes the sequence and generates finding `FIND-xxxx`.
- **Correlation Agent** clusters events into a High-Severity Incident.
- **Response Agent** recommends `IPTABLES_BLOCK_IP` for `192.168.56.20`.

---

## Scenario B: Network Reconnaissance & Port Scanning

### 1. Goal
Simulate an attacker scanning the Server VM to discover open listening services.

### 2. Execution from Attacker VM (`192.168.56.20`):
```bash
python3 attacker_toolkit.py --target 192.168.56.15 --scenario port_scan
# Or using nmap:
nmap -sS -p 21,22,23,80,443,445,1433,3389,8080 192.168.56.15
```

### 3. Expected Telemetry & SOC Detection:
- Server VM socket monitor detects multiple connection attempts to 9 distinct ports.
- Guest daemon pushes connection telemetry to SOC.
- **Network Monitoring Agent** triggers rule `RULE-NET-001` (Port Scanning & Sweeping).
- Incident is generated or updated with attack path: `192.168.56.20 → Server VM Service Ports`.

---

## Scenario C: Multi-Stage Account Compromise & Data Staging

### 1. Goal
Simulate the full APT29 cyber intrusion kill-chain.

### 2. Execution from Attacker VM (`192.168.56.20`):
```bash
python3 attacker_toolkit.py --target 192.168.56.15 --scenario multi_stage
```

### 3. Expected Telemetry & SOC Detection:
- OpenSSH logs failure followed by success (`file_action="SUCCESS_POST_BURST"`).
- Sudo audit logs privilege escalation attempt (`sudo -u root bash -i`).
- File access event logged for `/var/backups/customers_backup.sql`.
- **Threat Intelligence Agent** identifies suspicious indicators.
- **Malicious Behaviour Agent** identifies the composite kill-chain.
- **Risk Engine** computes Critical Risk Score ($88/100$).
- **Response Agent** formulates containment:
  1. `IPTABLES_BLOCK_IP` (block attacker IP on server)
  2. `DISABLE_USER` (lock compromised account)
