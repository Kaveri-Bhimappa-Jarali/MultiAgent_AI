#!/usr/bin/env bash
set -e

mkdir -p /opt/soc-agent
if [ -f /tmp/vm_telemetry_collector.py ]; then
    mv /tmp/vm_telemetry_collector.py /opt/soc-agent/vm_telemetry_collector.py
fi
chmod +x /opt/soc-agent/vm_telemetry_collector.py

cat << 'EOF' > /etc/systemd/system/soc-agent.service
[Unit]
Description=SOC Virtual Machine Guest Telemetry Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/soc-agent
ExecStart=/usr/bin/python3 /opt/soc-agent/vm_telemetry_collector.py http://127.0.0.1:18000 vm-attacker-01 VM-KEY-ATTACKER-TEST-2026 /var/log/auth.log
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable soc-agent
systemctl restart soc-agent
systemctl status soc-agent --no-pager
