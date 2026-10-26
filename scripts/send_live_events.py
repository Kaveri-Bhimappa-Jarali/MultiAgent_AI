#!/usr/bin/env python3
"""
Standalone Real-Time Security Telemetry Streaming Client.
Sends live simulated or realistic attack telemetry to the running SOC ingestion pipeline
from a separate terminal, demonstrating hands-free automatic detection without manual triggers.
"""

import sys
import time
import argparse
import uuid
from datetime import datetime, timezone
import httpx

def get_scenario_events(scenario: str) -> list:
    if scenario == "brute_force":
        # Sequence of repeated failed SSH login attempts from an external attacker IP
        attacker_ip = "185.220.101.45"
        return [
            {
                "event_type": "authentication",
                "severity": "MEDIUM",
                "source_ip": attacker_ip,
                "destination_ip": "10.0.1.15",
                "destination_port": 22,
                "username": "sarah.connor",
                "host": "AUTH-SRV-01",
                "file_action": "FAILED",
                "command_line": f"sshd: Failed password for invalid user sarah.connor from {attacker_ip} port 49152 ssh2",
                "source_type": "EXTERNAL_SCRIPT"
            },
            {
                "event_type": "authentication",
                "severity": "MEDIUM",
                "source_ip": attacker_ip,
                "destination_ip": "10.0.1.15",
                "destination_port": 22,
                "username": "sarah.connor",
                "host": "AUTH-SRV-01",
                "file_action": "FAILED",
                "command_line": f"sshd: Failed password for invalid user sarah.connor from {attacker_ip} port 49153 ssh2",
                "source_type": "EXTERNAL_SCRIPT"
            },
            {
                "event_type": "authentication",
                "severity": "HIGH",
                "source_ip": attacker_ip,
                "destination_ip": "10.0.1.15",
                "destination_port": 22,
                "username": "sarah.connor",
                "host": "AUTH-SRV-01",
                "file_action": "FAILED",
                "command_line": f"sshd: Failed password for invalid user sarah.connor from {attacker_ip} port 49154 ssh2 (PAM_MAX_TRIES)",
                "source_type": "EXTERNAL_SCRIPT"
            },
            {
                "event_type": "authentication",
                "severity": "HIGH",
                "source_ip": attacker_ip,
                "destination_ip": "10.0.1.15",
                "destination_port": 22,
                "username": "sarah.connor",
                "host": "AUTH-SRV-01",
                "file_action": "FAILED",
                "command_line": f"sshd: Connection reset by authenticating user {attacker_ip} [preauth]",
                "source_type": "EXTERNAL_SCRIPT"
            }
        ]

    elif scenario == "port_scan":
        # Rapid port sweep across multiple ports
        scanner_ip = "192.0.2.144"
        ports = [21, 22, 23, 80, 443, 445, 1433, 3389, 8080]
        return [
            {
                "event_type": "network_connection",
                "severity": "HIGH" if p in [445, 1433, 3389] else "MEDIUM",
                "source_ip": scanner_ip,
                "destination_ip": "10.0.1.50",
                "destination_port": p,
                "protocol": "TCP",
                "host": "WEB-PROD-01",
                "command_line": f"TCP SYN stealth scan probe to port {p}",
                "source_type": "EXTERNAL_SCRIPT"
            }
            for p in ports
        ]

    elif scenario == "account_compromise":
        # Multi-stage intrusion: Login failure -> Success -> Sudo Root -> Sensitive file access
        c2_ip = "198.51.100.23"
        return [
            {
                "event_type": "authentication",
                "severity": "MEDIUM",
                "source_ip": c2_ip,
                "destination_ip": "10.0.1.20",
                "username": "vikram.sharma",
                "host": "VPN-GW-01",
                "file_action": "FAILED",
                "command_line": "VPN Auth failure for vikram.sharma",
                "source_type": "EXTERNAL_SCRIPT"
            },
            {
                "event_type": "authentication",
                "severity": "CRITICAL",
                "source_ip": c2_ip,
                "destination_ip": "10.0.1.20",
                "username": "vikram.sharma",
                "host": "VPN-GW-01",
                "file_action": "SUCCESS_POST_BURST",
                "command_line": "Successful VPN session established post burst",
                "source_type": "EXTERNAL_SCRIPT"
            },
            {
                "event_type": "privilege_escalation",
                "severity": "CRITICAL",
                "source_ip": c2_ip,
                "username": "vikram.sharma",
                "host": "DB-FIN-01",
                "command_line": "sudo -u root bash -i",
                "source_type": "EXTERNAL_SCRIPT"
            },
            {
                "event_type": "file_access",
                "severity": "HIGH",
                "username": "vikram.sharma",
                "host": "DB-FIN-01",
                "file_path": "/var/backups/customers_backup.sql",
                "command_line": "tar -czf /tmp/exfil.tar.gz /var/backups/customers_backup.sql",
                "source_type": "EXTERNAL_SCRIPT"
            }
        ]

    else:
        # Default single event
        return [
            {
                "event_type": "authentication",
                "severity": "MEDIUM",
                "source_ip": "203.0.113.195",
                "username": "demo.user",
                "host": "WS-01",
                "file_action": "FAILED",
                "command_line": "Failed password attempt",
                "source_type": "EXTERNAL_SCRIPT"
            }
        ]

def main():
    parser = argparse.ArgumentParser(description="Send live telemetry events to the SOC ingestion gateway.")
    parser.add_argument("--scenario", choices=["brute_force", "port_scan", "account_compromise", "single"], default="brute_force", help="Attack scenario to stream")
    parser.add_argument("--host", default="http://127.0.0.1:8000", help="Base backend URL")
    parser.add_argument("--rate", type=float, default=1.0, help="Events per second rate")
    args = parser.parse_args()

    ingest_url = f"{args.host}/api/events/ingest"
    health_url = f"{args.host}/health"
    pipeline_url = f"{args.host}/api/health/pipeline"

    print("=" * 70)
    print("   MULTI-AGENT AI SOC - LIVE STREAMING TELEMETRY CLIENT")
    print("=" * 70)
    print(f"Target SOC Gateway: {ingest_url}")
    print(f"Scenario:          {args.scenario}")
    print(f"Streaming Rate:    {args.rate} events/sec\n")

    # Verify server connectivity
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(health_url)
            if resp.status_code != 200:
                print(f"[!] Server returned non-200 health check: {resp.status_code}")
                sys.exit(1)
            print("[+] Connected to SOC Backend Engine successfully.")
    except Exception as e:
        print(f"[!] Could not connect to SOC backend at {health_url}: {e}")
        print("    Please ensure the backend is running using start.bat or uvicorn.")
        sys.exit(1)

    events = get_scenario_events(args.scenario)
    interval = 1.0 / args.rate

    print(f"\n[>] Streaming {len(events)} telemetry events into SOC ingestion pipeline...")
    with httpx.Client(timeout=10.0) as client:
        for idx, evt in enumerate(events, 1):
            evt["event_id"] = f"EVT-LIVE-{uuid.uuid4().hex[:8].upper()}"
            evt["timestamp"] = datetime.now(timezone.utc).isoformat()
            
            t0 = time.perf_counter()
            resp = client.post(ingest_url, json=evt)
            latency_ms = (time.perf_counter() - t0) * 1000

            if resp.status_code == 200:
                res_data = resp.json()
                print(f"  [{idx}/{len(events)}] Ingested {evt['event_id']} ({evt['event_type']}) -> Queued ({latency_ms:.1f}ms HTTP turnaround)")
            else:
                print(f"  [!] Failed to ingest {evt['event_id']}: {resp.status_code} - {resp.text}")

            if idx < len(events):
                time.sleep(interval)

    # Allow worker a moment to complete asynchronous detection & correlation
    print("\n[*] Waiting 2 seconds for asynchronous agent pipeline & correlation...")
    time.sleep(2.0)

    # Check pipeline telemetry metrics
    try:
        with httpx.Client(timeout=5.0) as client:
            p_res = client.get(pipeline_url)
            if p_res.status_code == 200:
                m = p_res.json()
                q = m.get("queue", {})
                print("\n" + "=" * 70)
                print("   MEASURED REAL-TIME PIPELINE METRICS")
                print("=" * 70)
                print(f"Queue Status:               {m.get('status')}")
                print(f"Total Processed Jobs:       {q.get('total_processed')}")
                print(f"Current Queue Depth:        {q.get('queue_depth')} pending")
                print(f"Avg Detection Latency:      {q.get('avg_detection_latency_ms')} ms")
                print(f"Avg Incident Latency:       {q.get('avg_incident_latency_ms')} ms")
                print(f"WebSocket Broadcasts:       {m.get('websocket', {}).get('total_broadcasts')}")
                print("=" * 70)
                print("[SUCCESS] Telemetry sequence processed hands-free without manual button clicks!")
    except Exception as e:
        print(f"[!] Could not query pipeline health: {e}")

if __name__ == "__main__":
    main()
