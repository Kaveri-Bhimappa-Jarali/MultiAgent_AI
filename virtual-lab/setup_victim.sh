#!/usr/bin/env bash
set -e

mkdir -p /opt/soc-agent
mkdir -p /var/www/soc-lab
if [ -f /tmp/vm_telemetry_collector.py ]; then
    mv /tmp/vm_telemetry_collector.py /opt/soc-agent/vm_telemetry_collector.py
fi
chmod +x /opt/soc-agent/vm_telemetry_collector.py

cat << 'EOF' > /var/www/soc-lab/index.html
<!DOCTYPE html>
<html>
<head><title>Enterprise Web Server</title></head>
<body><h1>SOC Lab - Victim Endpoint Node (ip-10-0-0-18)</h1></body>
</html>
EOF

cat << 'EOF' > /etc/nginx/sites-available/soc-lab
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    root /var/www/soc-lab;
    index index.html;
    server_name _;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    location / {
        try_files $uri $uri/ =404;
    }
}

server {
    listen 127.0.0.1:8000;
    server_name localhost;

    location / {
        proxy_pass http://127.0.0.1:18000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 5s;
        proxy_read_timeout 10s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/soc-lab /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

cat << 'EOF' > /etc/systemd/system/soc-agent.service
[Unit]
Description=SOC Virtual Machine Guest Telemetry Agent
After=network.target nginx.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/soc-agent
Environment="SOC_NETWORK_PEER_IP=10.0.0.19"
Environment="SOC_NETWORK_INTERFACE=eth0"
ExecStart=/usr/bin/python3 /opt/soc-agent/vm_telemetry_collector.py http://127.0.0.1:18000 vm-endpoint-01 VM-KEY-ENDPOINT-SEC-2026 /var/log/auth.log
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable soc-agent
systemctl restart soc-agent
systemctl status soc-agent --no-pager
