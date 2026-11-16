#!/usr/bin/env python3
"""
Persistent SSH Reverse Tunnel Manager for Virtual Lab VMs.
Maintains reverse tunnels (127.0.0.1:18000 -> 127.0.0.1:8000) for Victim VM and Attacker VM.
Automatically clears stale listeners and reconnects if dropped.
"""

import sys
import os
import time
import subprocess
import threading

VICTIM_IP = "45.74.156.43"
ATTACKER_IP = "45.74.156.44"
SSH_USER = "ubuntu"
SSH_KEY = os.path.expanduser(r"~\.ssh\id_ed25519")

def tunnel_worker(host: str, name: str):
    print(f"[{name}] Starting persistent tunnel loop to {host}...")
    while True:
        try:
            # 1. Clear any stale listeners on remote port 18000
            clear_cmd = [
                "ssh", "-i", SSH_KEY,
                "-o", "BatchMode=yes",
                "-o", "StrictHostKeyChecking=accept-new",
                "-o", "ConnectTimeout=10",
                f"{SSH_USER}@{host}",
                "sudo fuser -k 18000/tcp 2>/dev/null || true"
            ]
            subprocess.run(clear_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
            
            # 2. Launch reverse tunnel with active keepalives
            tunnel_cmd = [
                "ssh", "-i", SSH_KEY,
                "-o", "BatchMode=yes",
                "-o", "StrictHostKeyChecking=accept-new",
                "-o", "ServerAliveInterval=10",
                "-o", "ServerAliveCountMax=6",
                "-o", "ExitOnForwardFailure=yes",
                "-N", "-T",
                "-R", "127.0.0.1:18000:127.0.0.1:8000",
                f"{SSH_USER}@{host}"
            ]
            print(f"[{name}] Reverse tunnel active (127.0.0.1:18000 -> :8000 on {host})")
            proc = subprocess.Popen(tunnel_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            proc.wait()
            print(f"[{name}] Tunnel exited (code {proc.returncode}). Reconnecting in 3s...")
        except Exception as e:
            print(f"[{name}] Exception in tunnel worker: {e}")
        time.sleep(3)

if __name__ == "__main__":
    t_victim = threading.Thread(target=tunnel_worker, args=(VICTIM_IP, "VictimVM"), daemon=True)
    t_attacker = threading.Thread(target=tunnel_worker, args=(ATTACKER_IP, "AttackerVM"), daemon=True)
    t_victim.start()
    t_attacker.start()

    print("[TunnelManager] Both tunnel threads running. Press Ctrl+C to stop.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("[TunnelManager] Exiting.")
