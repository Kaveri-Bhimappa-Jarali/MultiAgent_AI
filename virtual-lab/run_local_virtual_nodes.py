#!/usr/bin/env python3
"""
Run three local guest-agent processes that report to the SOC Host.
These processes simulate guest nodes locally; they are not independent VMs.
"""

import os
import subprocess
import sys
import threading
import time
from datetime import datetime

DEFAULT_SOC_URL = "http://127.0.0.1:8000"
HEARTBEAT_STARTUP_TIMEOUT = 30

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


def resolve_soc_url(argv=None, environ=None):
    argv = sys.argv[1:] if argv is None else argv
    environ = os.environ if environ is None else environ
    soc_url = argv[0] if argv else environ.get("SOC_HOST_URL", DEFAULT_SOC_URL)
    if not soc_url.strip():
        raise ValueError("SOC_HOST_URL must not be empty")
    return soc_url.rstrip("/")


def start_guest_node(soc_url, node, log_file):
    script_path = os.path.join(
        os.path.dirname(__file__), "guest-agent", "vm_telemetry_collector.py"
    )
    command = [
        sys.executable,
        "-u",
        script_path,
        soc_url,
        node["vm_id"],
        node["api_key"],
        log_file
    ]
    return subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )


def read_guest_output(vm_id, process, heartbeat_ack):
    if process.stdout is None:
        raise RuntimeError(f"{vm_id} process stdout was not captured")
    for line in iter(process.stdout.readline, ""):
        line = line.strip()
        if line:
            print(f"[{vm_id}] {line}")
            if "Heartbeat acknowledged by SOC Host." in line:
                heartbeat_ack.set()


def _read_guest_output_guarded(vm_id, process, heartbeat_ack, errors):
    try:
        read_guest_output(vm_id, process, heartbeat_ack)
    except Exception as exc:
        errors.append((vm_id, exc))


def wait_for_guest_readiness(processes, heartbeat_acks, reader_errors, timeout):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if reader_errors:
            vm_id, error = reader_errors[0]
            raise RuntimeError(f"Could not read {vm_id} output: {error}") from error

        stopped = [
            f"{vm_id} (exit code {process.poll()})"
            for vm_id, process in processes.items()
            if process.poll() is not None
        ]
        if stopped:
            raise RuntimeError(
                "Guest process exited before heartbeat confirmation: "
                + ", ".join(stopped)
            )

        if all(event.is_set() for event in heartbeat_acks.values()):
            return
        time.sleep(0.1)

    pending = [
        vm_id for vm_id, event in heartbeat_acks.items() if not event.is_set()
    ]
    raise TimeoutError(
        "Timed out waiting for SOC Host heartbeat acknowledgements from: "
        + ", ".join(pending)
    )


def stop_guest_processes(processes, reader_threads):
    for vm_id, process in processes.items():
        if process.poll() is None:
            try:
                process.terminate()
            except OSError as exc:
                print(f"[!] Could not terminate {vm_id}: {exc}", file=sys.stderr)

    for vm_id, process in processes.items():
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            try:
                process.kill()
                process.wait()
            except OSError as exc:
                print(f"[!] Could not kill {vm_id}: {exc}", file=sys.stderr)
        except OSError as exc:
            print(f"[!] Could not wait for {vm_id}: {exc}", file=sys.stderr)

    for thread in reader_threads:
        thread.join(timeout=5)
        if thread.is_alive():
            print(
                f"[!] Output reader thread {thread.name} did not stop",
                file=sys.stderr
            )


def main(argv=None):
    try:
        soc_url = resolve_soc_url(argv)
    except ValueError as exc:
        print(f"[!] {exc}", file=sys.stderr)
        return 2

    log_dir = os.path.join(os.path.dirname(__file__), "guest-agent")
    processes = {}
    heartbeat_acks = {node["vm_id"]: threading.Event() for node in NODES}
    reader_threads = []
    reader_errors = []
    exit_code = 0

    print("=" * 70)
    print("   VIRTUAL ENTERPRISE NETWORK LAB - LOCAL GUEST-AGENT RUNNER")
    print("=" * 70)
    print(f"Connecting to SOC Host at: {soc_url}")
    print("Starting local guest-agent processes (not independent VMs):")
    for node in NODES:
        print(f"  {node['vm_id']} ({node['role']}) - Subnet IP: {node['ip']}")
    print("=" * 70)

    try:
        os.makedirs(log_dir, exist_ok=True)
        for node in NODES:
            vm_id = node["vm_id"]
            log_file = os.path.join(log_dir, f"mock_{vm_id}.log")
            with open(log_file, "a", encoding="utf-8") as guest_log:
                guest_log.write(
                    f"# Node {vm_id} initialized at {datetime.now().isoformat()}\n"
                )

            process = start_guest_node(soc_url, node, log_file)
            processes[vm_id] = process
            reader = threading.Thread(
                target=_read_guest_output_guarded,
                args=(vm_id, process, heartbeat_acks[vm_id], reader_errors),
                name=f"{vm_id}-stdout",
                daemon=True
            )
            reader.start()
            reader_threads.append(reader)

        wait_for_guest_readiness(
            processes,
            heartbeat_acks,
            reader_errors,
            HEARTBEAT_STARTUP_TIMEOUT
        )
        if any(process.poll() is not None for process in processes.values()):
            raise RuntimeError("A guest process exited during startup verification")

        print(
            "\n[+] All three local guest-agent processes are running and their "
            "heartbeats were acknowledged by the SOC Host."
        )
        print("[*] Press Ctrl+C to terminate the local guest-agent processes.\n")

        while True:
            if reader_errors:
                vm_id, error = reader_errors[0]
                raise RuntimeError(f"Could not read {vm_id} output: {error}") from error
            stopped = [
                f"{vm_id} (exit code {process.poll()})"
                for vm_id, process in processes.items()
                if process.poll() is not None
            ]
            if stopped:
                raise RuntimeError("Guest process terminated: " + ", ".join(stopped))
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping local guest-agent processes...")
    except Exception as exc:
        print(f"[!] Local guest-agent runner failed: {exc}", file=sys.stderr)
        exit_code = 1
    finally:
        stop_guest_processes(processes, reader_threads)

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
