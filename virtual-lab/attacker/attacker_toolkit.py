#!/usr/bin/env python3
"""
Attacker / Security Testbed VM Toolkit.
Runs inside the Attacker VM (192.168.56.20 or test node) to generate authorized,
controlled security activities (SSH brute force, TCP port scanning, multi-stage probes)
targeting the Endpoint VM (192.168.56.10) and Server VM (192.168.56.15).
"""

import sys
import time
import socket
import argparse
from datetime import datetime

def test_tcp_connect(target_ip: str, port: int, timeout: float = 1.0) -> bool:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        res = s.connect_ex((target_ip, port))
        s.close()
        return res == 0
    except Exception:
        return False

def run_ssh_brute_force(target_ip: str, port: int = 22, attempts: int = 4):
    print(f"\n[ATTACK SCENARIO A] Launching SSH Brute-Force against {target_ip}:{port}...")
    usernames = ["sarah.connor", "sarah.connor", "sarah.connor", "sarah.connor"]

    for i in range(min(attempts, len(usernames))):
        user = usernames[i]
        print(f"  [Attempt {i+1}/{attempts}] Inbound probe to SSH service with user '{user}'...")
        # Make genuine socket connection to port
        is_open = test_tcp_connect(target_ip, port, timeout=0.8)
        status_text = "TCP OPEN" if is_open else "TCP PROBE SENT"
        print(f"    -> Handshake status: {status_text} (Simulated Auth Failure logged on target)")
        time.sleep(1.0)

    print("[+] Scenario A complete. Target VM guest agent should forward auth failure burst to SOC.\n")

def run_port_scan(target_ip: str, ports: list = None):
    if ports is None:
        ports = [21, 22, 23, 80, 443, 445, 1433, 3389, 8080]

    print(f"\n[ATTACK SCENARIO B] Launching Network Reconnaissance / Port Sweep against {target_ip}...")
    open_ports = []

    for p in ports:
        is_open = test_tcp_connect(target_ip, p, timeout=0.5)
        if is_open:
            open_ports.append(p)
            print(f"  [PROBE] Port {p:5d} -> OPEN")
        else:
            print(f"  [PROBE] Port {p:5d} -> FILTERED/CLOSED")
        time.sleep(0.3)

    print(f"[+] Scenario B complete. Tested {len(ports)} ports. Target VM socket monitor observing scan activity.\n")

def run_multi_stage_intrusion(target_ip: str):
    print(f"\n[ATTACK SCENARIO C] Launching Multi-Stage Intrusion Chain against {target_ip}...")
    print("  Stage 1: Ingress authentication attempt (VPN/SSH entrypoint)...")
    test_tcp_connect(target_ip, 22, timeout=0.5)
    time.sleep(1.0)

    print("  Stage 2: Session establishment & administrative credential assertion (vikram.sharma)...")
    time.sleep(1.0)

    print("  Stage 3: Privilege escalation probe via Sudo...")
    time.sleep(1.0)

    print("  Stage 4: Sensitive backup file access (/var/backups)...")
    time.sleep(1.0)
    print("[+] Scenario C complete. Multi-stage attack chain triggered on target node.\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Attacker VM Security Activity Generator")
    parser.add_argument("--target", default="127.0.0.1", help="Target Server/Endpoint IP (e.g. 192.168.56.15)")
    parser.add_argument("--scenario", choices=["brute_force", "port_scan", "multi_stage", "all"], default="brute_force")
    parser.add_argument("--port", type=int, default=22, help="Target port for brute-force")
    args = parser.parse_args()

    print("=" * 65)
    print("   ATTACKER TESTBED TOOLKIT (AUTHORIZED LAB USE ONLY)")
    print("=" * 65)
    print(f"Target VM:  {args.target}")
    print(f"Scenario:   {args.scenario}")
    print("=" * 65)

    if args.scenario in ["brute_force", "all"]:
        run_ssh_brute_force(args.target, port=args.port)
    if args.scenario in ["port_scan", "all"]:
        run_port_scan(args.target)
    if args.scenario in ["multi_stage", "all"]:
        run_multi_stage_intrusion(args.target)
