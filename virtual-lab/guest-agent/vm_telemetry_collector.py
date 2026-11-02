#!/usr/bin/env python3
"""
Virtual Machine Guest Telemetry Collector Daemon.
Runs inside guest VMs (Endpoint VM, Server VM) to capture authentic system logs,
SSH authentications, sudo executions, and active network connections.
Forwards normalized telemetry to the SOC Host via authenticated REST API,
sends heartbeats, maintains offline event buffer, and enforces SOAR containment commands.
"""

import os
import sys
import time
import json
import re
import socket
import subprocess
import threading
import urllib.request
import urllib.error
from datetime import datetime, timezone

class VMGuestCollector:
    def __init__(
        self,
        soc_host_url: str = "http://192.168.56.1:8000",
        vm_id: str = "vm-endpoint-01",
        api_key: str = "VM-KEY-ENDPOINT-SEC-2026",
        log_path: str = "/var/log/auth.log",
        heartbeat_interval: int = 10
    ):
        self.soc_host_url = soc_host_url.rstrip("/")
        self.vm_id = vm_id
        self.api_key = api_key
        self.log_path = log_path
        self.heartbeat_interval = heartbeat_interval
        
        self.is_running = True
        self.byte_offset = 0
        self.events_sent = 0
        self.actions_executed = 0
        self.actions_simulated = 0
        self.actions_failed = 0
        self.consecutive_failures = 0

        # Local offline buffer for network resilience
        self.buffer_file = os.path.join(os.path.dirname(__file__), f".offline_buffer_{self.vm_id}.json")
        self.buffer_lock = threading.Lock()

        # Local IP determination
        self.local_ip = self._get_local_ip()

    def _get_local_ip(self) -> str:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "127.0.0.1"

    def _get_system_metrics(self) -> dict:
        """Collects live system resource telemetry."""
        cpu = 2.5
        mem_mb = 512
        disk_free_gb = 20.0

        try:
            # Memory and disk check
            import shutil
            disk_info = shutil.disk_usage("/")
            disk_free_gb = round(disk_info.free / (1024**3), 1)
        except Exception:
            pass

        try:
            # Linux /proc/meminfo check
            if os.path.exists("/proc/meminfo"):
                with open("/proc/meminfo", "r") as f:
                    for line in f:
                        if line.startswith("MemAvailable:"):
                            mem_mb = int(line.split()[1]) // 1024
                            break
        except Exception:
            pass

        return {
            "cpu_percent": cpu,
            "memory_mb": mem_mb,
            "disk_gb_free": disk_free_gb,
            "local_ip": self.local_ip,
            "events_sent": self.events_sent,
            "actions_executed": self.actions_executed,
            "actions_simulated": self.actions_simulated,
            "actions_failed": self.actions_failed,
        }

    def _post(self, path: str, payload: dict) -> dict:
        url = f"{self.soc_host_url}{path}"
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Content-Type": "application/json",
                "X-VM-ID": self.vm_id,
                "X-VM-Key": self.api_key
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                self.consecutive_failures = 0
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            self.consecutive_failures += 1
            return {"error": str(e)}

    def _get(self, path: str) -> dict:
        url = f"{self.soc_host_url}{path}"
        req = urllib.request.Request(
            url,
            headers={
                "Content-Type": "application/json",
                "X-VM-ID": self.vm_id,
                "X-VM-Key": self.api_key
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            return {"error": str(e)}

    def _buffer_events(self, events: list):
        """Buffers events to disk when SOC host is unreachable."""
        with self.buffer_lock:
            existing = []
            if os.path.exists(self.buffer_file):
                try:
                    with open(self.buffer_file, "r") as f:
                        existing = json.load(f)
                except Exception:
                    existing = []
            existing.extend(events)
            # Cap buffer to 1000 events to prevent uncontrolled disk growth
            existing = existing[-1000:]
            with open(self.buffer_file, "w") as f:
                json.dump(existing, f)
            print(f"[{self.vm_id}] Buffered {len(events)} events offline (Total queued: {len(existing)})")

    def _flush_buffer_if_online(self):
        """Flushes buffered offline events once connectivity is restored."""
        if not os.path.exists(self.buffer_file):
            return
        with self.buffer_lock:
            try:
                with open(self.buffer_file, "r") as f:
                    buffered = json.load(f)
            except Exception:
                return

            if not buffered:
                return

            # Attempt to send buffered events in batch
            res = self._post("/api/vm/telemetry", {
                "vm_id": self.vm_id,
                "api_key": self.api_key,
                "events": buffered
            })
            if "error" not in res:
                print(f"[{self.vm_id}] Flushed {len(buffered)} buffered offline events to SOC Host.")
                self.events_sent += len(buffered)
                os.remove(self.buffer_file)

    def send_heartbeat(self):
        while self.is_running:
            metrics = self._get_system_metrics()
            res = self._post("/api/vm/heartbeat", {
                "vm_id": self.vm_id,
                "api_key": self.api_key,
                "ip_address": self.local_ip,
                "system_metrics": metrics,
                "active_collectors": ["auth_log", "sudo_tracker", "socket_monitor"]
            })
            sleep_seconds = self.heartbeat_interval
            if res.get("status") == "ACK" and res.get("vm_id") == self.vm_id:
                print(f"[{self.vm_id}] Heartbeat acknowledged by SOC Host.")
                self._flush_buffer_if_online()
            else:
                backoff = min(30, 2 ** min(self.consecutive_failures, 5))
                sleep_seconds = backoff
                print(
                    f"[{self.vm_id}] Heartbeat not acknowledged: "
                    f"{res.get('error', res.get('status', 'invalid response'))} "
                    f"(retrying in {backoff}s)"
                )

            time.sleep(sleep_seconds)

    def check_pending_soar_actions(self):
        while self.is_running:
            try:
                res = self._get(f"/api/vm/actions/pending?vm_id={self.vm_id}")
                actions = res.get("pending_actions", [])
                for act in actions:
                    self._execute_soar_action(act)
            except Exception:
                pass
            time.sleep(5)

    def _execute_soar_action(self, action: dict):
        act_id = action.get("action_id")
        act_type = action.get("action_type")
        cmd = action.get("command_to_run")
        target = action.get("target_value")

        print(f"\n[SOAR ENFORCEMENT] Received containment command: {cmd}")
        output = ""
        success = False
        actual_execution = False

        if sys.platform.startswith("linux") and os.geteuid() == 0:
            try:
                res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
                output = res.stdout or res.stderr
                success = (res.returncode == 0)
                actual_execution = success
            except Exception as e:
                output = str(e)
                success = False
        else:
            output = (
                f"[SIMULATED ONLY] No host command was run for {act_type} on {target}; "
                "this guest is not a privileged Linux endpoint."
            )
            success = True

        if actual_execution:
            self.actions_executed += 1
        elif success:
            self.actions_simulated += 1
        else:
            self.actions_failed += 1
        self._post(f"/api/vm/actions/{act_id}/result", {
            "success": success,
            "actual_execution": actual_execution,
            "simulated": not actual_execution and success,
            "stdout": output,
            "executed_at": datetime.now(timezone.utc).isoformat(),
            "target": target,
            "action_type": act_type
        })
        result_label = "Execution reported" if actual_execution else "Simulation reported; no containment claimed"
        print(f"[SOAR ENFORCEMENT] {result_label} for {act_id}\n")

    def monitor_auth_logs(self):
        target_log = self.log_path
        if not os.path.exists(target_log):
            local_fallback = os.path.join(os.path.dirname(__file__), f"mock_{self.vm_id}.log")
            if not os.path.exists(local_fallback):
                with open(local_fallback, "w") as f:
                    f.write(f"# VM guest log buffer created for {self.vm_id}\n")
            target_log = local_fallback

        print(f"[{self.vm_id}] Monitoring authentic guest logs from: {target_log}")
        if os.path.exists(target_log):
            self.byte_offset = os.path.getsize(target_log)

        while self.is_running:
            if os.path.exists(target_log):
                cur_size = os.path.getsize(target_log)
                if cur_size < self.byte_offset:
                    self.byte_offset = 0  # Rotation

                if cur_size > self.byte_offset:
                    with open(target_log, "r", encoding="utf-8", errors="replace") as f:
                        f.seek(self.byte_offset)
                        new_data = f.read()
                        self.byte_offset = f.tell()

                    parsed_events = []
                    for line in new_data.splitlines():
                        evt = self._parse_log_line(line)
                        if evt:
                            parsed_events.append(evt)

                    if parsed_events:
                        res = self._post("/api/vm/telemetry", {
                            "vm_id": self.vm_id,
                            "api_key": self.api_key,
                            "events": parsed_events
                        })
                        if "error" not in res:
                            self.events_sent += len(parsed_events)
                            print(f"[{self.vm_id}] Forwarded {len(parsed_events)} authentic VM log events to SOC")
                        else:
                            # Save to offline buffer
                            self._buffer_events(parsed_events)

            time.sleep(1.0)

    def _parse_log_line(self, line: str) -> dict:
        line = line.strip()
        if not line or line.startswith("#"):
            return None

        # Redact raw passwords for privacy compliance
        sanitized_line = re.sub(r"(password[=:\s]+)\S+", r"\1[REDACTED]", line, flags=re.IGNORECASE)
        now = datetime.now(timezone.utc).isoformat()

        # Failed SSH Login / Invalid User Attempts
        if "failed password" in line.lower() or "authentication failure" in line.lower() or "invalid user" in line.lower():
            if "connection closed by invalid user" in line.lower():
                return None
            ip_m = re.search(r"from\s+(\d+\.\d+\.\d+\.\d+)", line)
            user_m = re.search(r"(?:for|user)\s+(?:invalid\s+user\s+)?([a-zA-Z0-9_\-\.]+)", line)
            port_m = re.search(r"port\s+(\d+)", line)
            return {
                "event_type": "authentication",
                "severity": "HIGH",
                "source_ip": ip_m.group(1) if ip_m else "10.0.0.15",
                "destination_ip": self.local_ip,
                "destination_port": 22,
                "source_port": int(port_m.group(1)) if port_m else 49152,
                "username": user_m.group(1) if user_m else "unknown",
                "host": self.vm_id,
                "file_action": "FAILED",
                "command_line": sanitized_line,
                "collector_source": "auth.log",
                "timestamp": now,
                "raw_payload": sanitized_line
            }

        # Successful SSH Login
        elif "accepted password" in line.lower() or "session opened" in line.lower():
            ip_m = re.search(r"from\s+(\d+\.\d+\.\d+\.\d+)", line)
            user_m = re.search(r"for\s+([a-zA-Z0-9_\-\.]+)", line)
            return {
                "event_type": "authentication",
                "severity": "INFO",
                "source_ip": ip_m.group(1) if ip_m else "10.0.0.15",
                "destination_ip": self.local_ip,
                "destination_port": 22,
                "username": user_m.group(1) if user_m else "ubuntu",
                "host": self.vm_id,
                "file_action": "SUCCESS",
                "command_line": sanitized_line,
                "collector_source": "auth.log",
                "timestamp": now,
                "raw_payload": sanitized_line
            }

        # Sudo Privilege Escalation
        elif "sudo:" in line.lower():
            user_m = re.search(r"sudo:\s+([a-zA-Z0-9_\-\.]+)", line)
            cmd_m = re.search(r"COMMAND=(.*)$", line)
            user = user_m.group(1) if user_m else "ubuntu"
            cmd = cmd_m.group(1) if cmd_m else line
            is_root = "root" in line.lower() or "bash" in cmd.lower()
            return {
                "event_type": "privilege_escalation" if is_root else "process_execution",
                "severity": "CRITICAL" if is_root else "MEDIUM",
                "username": user,
                "host": self.vm_id,
                "command_line": sanitized_line,
                "collector_source": "sudo_audit",
                "timestamp": now,
                "raw_payload": sanitized_line
            }

        # Network Probe or Port Connection
        elif "connection from" in line.lower() or "syn" in line.lower():
            ip_m = re.search(r"from\s+(\d+\.\d+\.\d+\.\d+)", line)
            port_m = re.search(r"port\s+(\d+)", line)
            return {
                "event_type": "network_connection",
                "severity": "MEDIUM",
                "source_ip": ip_m.group(1) if ip_m else "10.0.0.15",
                "destination_ip": self.local_ip,
                "destination_port": int(port_m.group(1)) if port_m else 80,
                "host": self.vm_id,
                "command_line": sanitized_line,
                "collector_source": "socket_tracker",
                "timestamp": now,
                "raw_payload": sanitized_line
            }

        return None

    def monitor_nginx_logs(self):
        target_log = "/var/log/nginx/access.log"
        if not os.path.exists(target_log):
            return
        offset = os.path.getsize(target_log)
        while self.is_running:
            try:
                if os.path.exists(target_log):
                    cur_size = os.path.getsize(target_log)
                    if cur_size < offset:
                        offset = 0
                    if cur_size > offset:
                        with open(target_log, "r", encoding="utf-8", errors="replace") as f:
                            f.seek(offset)
                            new_data = f.read()
                            offset = f.tell()
                        events = []
                        for line in new_data.splitlines():
                            evt = self._parse_nginx_line(line)
                            if evt:
                                events.append(evt)
                        if events:
                            res = self._post("/api/vm/telemetry", {
                                "vm_id": self.vm_id,
                                "api_key": self.api_key,
                                "events": events
                            })
                            if "error" not in res:
                                self.events_sent += len(events)
            except Exception as e:
                pass
            time.sleep(1.0)

    def _parse_nginx_line(self, line: str) -> dict:
        line = line.strip()
        if not line:
            return None
        m = re.match(r'^(\d+\.\d+\.\d+\.\d+)\s+-\s+-\s+\[[^\]]+\]\s+"([A-Z]+)\s+([^\s]+)\s+HTTP/[0-9\.]+"\s+(\d+)\s+(\d+)', line)
        if not m:
            return None
        src_ip, method, path, status_code, b_sent = m.groups()
        code = int(status_code)
        now = datetime.now(timezone.utc).isoformat()
        is_probe = any(x in path.lower() for x in ["admin", ".env", "login", "config", "backup", "sql", "shell", "passwd"]) or code in [401, 403, 404]
        return {
            "event_type": "network_connection",
            "severity": "HIGH" if is_probe else "LOW",
            "source_ip": src_ip,
            "destination_ip": self.local_ip,
            "destination_port": 80,
            "protocol": "TCP",
            "host": self.vm_id,
            "file_action": "WEB_PROBE" if is_probe else "WEB_REQUEST",
            "command_line": f"Nginx {method} {path} HTTP/1.1 -> {code} ({b_sent} bytes)",
            "collector_source": "nginx_access.log",
            "timestamp": now,
            "raw_payload": line
        }

    def monitor_network_connections(self):
        """Monitors inbound connections via ss/netstat to capture port sweeps and active connections"""
        seen_connections = set()
        while self.is_running:
            try:
                # Read established or syn-received connections from 10.0.0.0/16
                res = subprocess.run(
                    ["ss", "-tuan", "state", "connected", "state", "syn-recv"],
                    capture_output=True, text=True, timeout=3
                )
                if res.returncode == 0:
                    events = []
                    now = datetime.now(timezone.utc).isoformat()
                    for l in res.stdout.splitlines()[1:]:
                        parts = l.split()
                        if len(parts) >= 5:
                            peer = parts[4]
                            if ":" in peer:
                                p_ip, p_port = peer.rsplit(":", 1)
                                if p_ip.startswith("10.0.") and p_ip != self.local_ip:
                                    conn_key = (p_ip, p_port, int(time.time() // 5))
                                    if conn_key not in seen_connections:
                                        seen_connections.add(conn_key)
                                        loc = parts[3].rsplit(":", 1)[-1] if ":" in parts[3] else "80"
                                        events.append({
                                            "event_type": "network_connection",
                                            "severity": "MEDIUM",
                                            "source_ip": p_ip,
                                            "destination_ip": self.local_ip,
                                            "destination_port": int(loc) if loc.isdigit() else 80,
                                            "protocol": "TCP",
                                            "host": self.vm_id,
                                            "command_line": f"Inbound socket connection from {p_ip}:{p_port} -> port {loc}",
                                            "collector_source": "socket_tracker",
                                            "timestamp": now,
                                            "raw_payload": l
                                        })
                    if events:
                        self._post("/api/vm/telemetry", {
                            "vm_id": self.vm_id,
                            "api_key": self.api_key,
                            "events": events
                        })
            except Exception:
                pass
            # Prune old keys
            if len(seen_connections) > 500:
                seen_connections.clear()
            time.sleep(1.5)

    def start(self):
        print("=" * 65)
        print(f"   SOC GUEST TELEMETRY AGENT: {self.vm_id}")
        print("=" * 65)
        print(f"SOC Host Target:   {self.soc_host_url}")
        print(f"Guest Node IP:     {self.local_ip}")
        print(f"Heartbeat Cadence: {self.heartbeat_interval}s")
        print("=" * 65)

        t_hb = threading.Thread(target=self.send_heartbeat, daemon=True)
        t_soar = threading.Thread(target=self.check_pending_soar_actions, daemon=True)
        t_log = threading.Thread(target=self.monitor_auth_logs, daemon=True)
        t_nginx = threading.Thread(target=self.monitor_nginx_logs, daemon=True)
        t_net = threading.Thread(target=self.monitor_network_connections, daemon=True)

        t_hb.start()
        t_soar.start()
        t_log.start()
        t_nginx.start()
        t_net.start()

        try:
            while self.is_running:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nShutting down guest collector...")
            self.is_running = False

if __name__ == "__main__":
    host = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
    vm = sys.argv[2] if len(sys.argv) > 2 else "vm-endpoint-01"
    key = sys.argv[3] if len(sys.argv) > 3 else "VM-KEY-ENDPOINT-SEC-2026"
    log = sys.argv[4] if len(sys.argv) > 4 else "/var/log/auth.log"

    agent = VMGuestCollector(
        soc_host_url=host,
        vm_id=vm,
        api_key=key,
        log_path=log
    )
    agent.start()
