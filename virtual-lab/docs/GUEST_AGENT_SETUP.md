# Guest Telemetry Collector Daemon Setup Guide

This guide details how to install and run the authentic SOC telemetry agent (`vm_telemetry_collector.py`) inside any Linux guest VM (Ubuntu, Debian, Alpine, Kali).

---

## 1. Prerequisites on the Guest VM
- Python 3.8+ (standard library only; no pip dependencies required)
- Network access to SOC Host on port 8000 (`192.168.56.1:8000`)
- Root privileges if you want the agent to automatically enforce real `iptables` drop rules

---

## 2. Quick-Start Execution

### On Endpoint VM (192.168.56.10):
```bash
python3 vm_telemetry_collector.py http://192.168.56.1:8000 vm-endpoint-01 VM-KEY-ENDPOINT-SEC-2026 /var/log/auth.log
```

### On Server VM (192.168.56.15):
```bash
python3 vm_telemetry_collector.py http://192.168.56.1:8000 vm-server-01 VM-KEY-SERVER-PROD-2026 /var/log/auth.log
```

---

## 3. Running as a Persistent Systemd Service (Optional)

Create `/etc/systemd/system/soc-vm-agent.service`:

```ini
[Unit]
Description=SOC Virtual Machine Guest Telemetry Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/soc-agent
ExecStart=/usr/bin/python3 /opt/soc-agent/vm_telemetry_collector.py http://192.168.56.1:8000 vm-server-01 VM-KEY-SERVER-PROD-2026 /var/log/auth.log
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable soc-vm-agent
sudo systemctl start soc-vm-agent
sudo systemctl status soc-vm-agent
```

---

## 4. How the Guest Daemon Works

1. **Heartbeat Thread:** Pings the SOC every 10 seconds with CPU usage, memory, active network sockets, and IP address.
2. **Log Watcher Thread:** Tails `/var/log/auth.log`, parses authentication events and sudo commands, and immediately POSTs them to `/api/vm/telemetry`.
3. **SOAR Enforcement Thread:** Polls `/api/vm/actions/pending` every 5 seconds. If the SOC Analyst authorizes an action (e.g., `IPTABLES_BLOCK_IP`), the agent runs the command on the VM, verifies the returncode, and reports execution back to the SOC.
