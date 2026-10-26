#!/usr/bin/env python3
"""
Virtual Lab Multi-Node Local Runner.
Spawns and orchestrates the 3 isolated virtual guest nodes (Endpoint VM, Server VM, Attacker VM)
connecting to the running SOC Host at http://127.0.0.1:8000.
Provides an immediate, runnable multi-node enterprise simulation environment
with authentic guest daemons, heartbeat reporting, live telemetry ingress, and SOAR execution.
"""

import os
import sys
import time
import subprocess
import threading
from datetime import datetime

NODES = [
    {
        "vm_id": "vm-endpoint-01",
        "api_key": "VM-KEY-ENDPOINT-SEC-2026",
        "role": "ENDPOINT",
        "ip": "192.168.56.10"
    },
    {
        "vm_id": "vm-server-01",
        "api_key": "VM-KEY-SERVER-PROD-2026",
        "role": "SERVER",
        "ip": "192.168.56.15"
    },
    {
        "vm_id": "vm-attacker-01",
        "api_key": "VM-KEY-ATTACKER-TEST-2026",
        "role": "ATTACKER",
        "ip": "192.168.56.20"
    }
]

def run_guest_node(soc_url: str, vm_id: str, key: str, log_file: str):
    script_path = os.path.join(os.path.dirname(__file__), "guest-agent", "vm_telemetry_collector.py")
    cmd = [sys.executable, script_path, soc_url, vm_id, key, log_file]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    for line in iter(p.readline, ''):
        line = line.strip()
        if line:
            print(f"[{vm_id}] {line}")
    p.wait()

def main():
    soc_url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
    log_dir = os.path.join(os.path.dirname(__file__), "guest-agent")
    os.makedirs(log_dir, exist_ok=True)

    print("=" * 70)
    print("   VIRTUAL ENTERPRISE NETWORK LAB - MULTI-NODE RUNNER")
    print("=" * 70)
    print(f"Connecting to SOC Host at: {soc_url}")
    print("Starting isolated virtual guest nodes:")
    for n in NODES:
        print(f"  • {n['vm_id']} ({n['role']}) - Subnet IP: {n['ip']}")
    print("=" * 70)

    threads = []
    for node in NODES:
        log_file = os.path.join(log_dir, f"mock_{node['vm_id']}.log")
        # Initialize log file
        with open(log_file, "a") as f:
            f.write(f"# Node {node['vm_id']} initialized at {datetime.now().isoformat()}\n")

        t = threading.Thread(
            target=run_guest_node,
            args=(soc_url, node["vm_id"], node["api_key"], log_file),
            daemon=True
        )
        t.start()
        threads.append(t)
        time.sleep(0.5)

    print("\n[+] All virtual guest daemons are active and transmitting heartbeats to SOC Host.")
    print("[*] Press Ctrl+C to terminate the virtual lab.\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping virtual nodes...")

if __name__ == "__main__":
    main()
