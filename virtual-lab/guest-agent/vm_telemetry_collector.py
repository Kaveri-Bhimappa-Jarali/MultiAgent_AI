#!/usr/bin/env python3
"""
Virtual Machine Guest Telemetry Collector Daemon.
Runs inside guest VMs (Endpoint VM, Server VM, Attacker VM) to capture authentic system logs,
SSH authentications, sudo executions, and active network connections.
Forwards normalized telemetry to the SOC Host via authenticated REST API,
sends heartbeats, maintains offline event buffer, and enforces SOAR containment commands.

Cross-Platform & Flexible Subnet Support:
- Auto-detects local network IP using outbound route to SOC Host (100% offline / isolated network compatible)
- Supports any private subnet (192.168.56.0/24, 192.168.x.x, 10.x.x.x, 172.16-31.x.x)
- Detects Debian/Ubuntu (/var/log/auth.log) and RHEL/CentOS/Rocky/Fedora (/var/log/secure)
- Auto-detects active network interface (enp0s3, enp0s8, ens33, eth0)
- Configurable via CLI flags, positional arguments, or environment variables
"""

import os
import sys
import time
import json
import re
import socket
import struct
import subprocess
import threading
import argparse
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone
from typing import Optional, List, Union


class VMGuestCollector:
    def __init__(
        self,
        soc_host_url: str = "http://192.168.56.1:8000",
        vm_id: str = "vm-endpoint-01",
        api_key: str = "VM-KEY-ENDPOINT-SEC-2026",
        log_path: Optional[str] = "/var/log/auth.log",
        configured_ip: Optional[str] = None,
        peer_ip: Optional[str] = None,
        network_interface: Optional[str] = None,
        heartbeat_interval: int = 10
    ):
        self.soc_host_url = soc_host_url.rstrip("/")
        self.vm_id = vm_id
        self.api_key = api_key
        self.log_path = log_path
        self.configured_ip = configured_ip
        self.peer_ip = peer_ip or os.environ.get("SOC_NETWORK_PEER_IP")
        self.network_interface = network_interface or os.environ.get("SOC_NETWORK_INTERFACE")
        self.heartbeat_interval = heartbeat_interval
        
        self.is_running = True
        self.byte_offsets = {}
        self.events_sent = 0
        self.actions_executed = 0
        self.actions_simulated = 0
        self.actions_failed = 0
        self.consecutive_failures = 0

        # Local offline buffer for network resilience
        self.buffer_file = os.path.join(os.path.dirname(__file__), f".offline_buffer_{self.vm_id}.json")
        self.buffer_lock = threading.Lock()

        # Dynamic Local IP determination (robust to isolated subnets)
        self.local_ip = self._get_local_ip()

    def _get_local_ip(self) -> str:
        """
        Determines the VM's active network IP without requiring public internet access.
        1. Checks explicit configured_ip or SOC_VM_IP env var.
        2. Probes UDP routing table towards SOC Host IP.
        3. Probes public route (if internet available).
        4. Resolves local hostname.
        5. Falls back to 127.0.0.1.
        """
        if self.configured_ip:
            return self.configured_ip
        env_ip = os.environ.get("SOC_VM_IP")
        if env_ip:
            return env_ip

        # Route probe towards SOC Host (works in 100% offline / air-gapped lab subnets)
        try:
            parsed = urllib.parse.urlparse(self.soc_host_url)
            host = parsed.hostname or "127.0.0.1"
            port = parsed.port or 8000
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect((host, port))
            ip = s.getsockname()[0]
            s.close()
            if ip and not ip.startswith("127."):
                return ip
        except Exception:
            pass

        # Fallback probe to public DNS (if VM has NAT/Internet)
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            if ip and not ip.startswith("127."):
                return ip
        except Exception:
            pass

        # Fallback to local hostname resolution
        try:
            ip = socket.gethostbyname(socket.gethostname())
            if ip and not ip.startswith("127."):
                return ip
        except Exception:
            pass

        return "127.0.0.1"

    def _get_system_metrics(self) -> dict:
        """Collects live system resource telemetry."""
        cpu = 2.5
        mem_mb = 512
        disk_free_gb = 20.0

        try:
            import shutil
            disk_info = shutil.disk_usage("/")
            disk_free_gb = round(disk_info.free / (1024**3), 1)
        except Exception:
            pass

        try:
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
        if "vm_id" not in payload:
            payload["vm_id"] = self.vm_id
        if "api_key" not in payload:
            payload["api_key"] = self.api_key

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
        except urllib.error.HTTPError as e:
            self.consecutive_failures += 1
            err_body = ""
            try:
                err_body = e.read().decode("utf-8")
            except Exception:
                pass
            if e.code == 401:
                print(f"[{self.vm_id}] [AUTH ERROR 401] Invalid API Key '{self.api_key}'. Check registered VM keys.")
            elif e.code == 404:
                print(f"[{self.vm_id}] [NOT FOUND 404] VM ID '{self.vm_id}' is not registered on SOC Host ({self.soc_host_url}).")
            return {"error": f"HTTP {e.code}: {e.reason}", "status_code": e.code, "detail": err_body}
        except urllib.error.URLError as e:
            self.consecutive_failures += 1
            return {"error": f"Connection failed to {self.soc_host_url}: {e.reason}"}
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

            res = self._post("/api/vm/telemetry", {
                "vm_id": self.vm_id,
                "api_key": self.api_key,
                "events": buffered
            })
            if "error" not in res:
                print(f"[{self.vm_id}] Flushed {len(buffered)} buffered offline events to SOC Host.")
                self.events_sent += len(buffered)
                try:
                    os.remove(self.buffer_file)
                except OSError:
                    pass

    def send_heartbeat(self):
        while self.is_running:
            metrics = self._get_system_metrics()
            collectors = ["auth_log", "sudo_tracker", "socket_monitor"]
            if os.path.exists("/var/log/nginx/access.log"):
                collectors.append("nginx_access")
            if self.peer_ip:
                collectors.append("packet_monitor")

            res = self._post("/api/vm/heartbeat", {
                "vm_id": self.vm_id,
                "api_key": self.api_key,
                "ip_address": self.local_ip,
                "system_metrics": metrics,
                "active_collectors": collectors
            })
            sleep_seconds = self.heartbeat_interval
            if res.get("status") == "ACK" and res.get("vm_id") == self.vm_id:
                print(f"[{self.vm_id}] Heartbeat acknowledged by SOC Host ({res.get('server_time')}). Node IP: {self.local_ip}")
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
                f"[SIMULATED ONLY] Command '{cmd}' was simulated. "
                "Guest collector is not running as root on a Linux endpoint."
            )
            success = True

        if actual_execution:
            self.actions_executed += 1
        elif success:
            self.actions_simulated += 1
        else:
            self.actions_failed += 1

        self._post(f"/api/vm/actions/{act_id}/result", {
            "action_id": act_id,
            "vm_id": self.vm_id,
            "api_key": self.api_key,
            "success": success,
            "actual_execution": actual_execution,
            "simulated": not actual_execution and success,
            "stdout": output,
            "executed_at": datetime.now(timezone.utc).isoformat(),
            "target": target,
            "action_type": act_type
        })
        result_label = "Actual execution reported" if actual_execution else "Simulation reported (safe mode)"
        print(f"[SOAR ENFORCEMENT] {result_label} for {act_id}\n")

    def _resolve_log_targets(self) -> List[str]:
        """Resolves existing log files across Debian/Ubuntu and RHEL/CentOS/Fedora families."""
        candidates = []
        if self.log_path:
            candidates.append(self.log_path)

        standard_logs = [
            "/var/log/auth.log",       # Debian / Ubuntu SSH & auth
            "/var/log/secure",         # RHEL / CentOS / Rocky / Fedora SSH & auth
            "/var/log/audit/audit.log",# Linux Auditd
            "/var/log/messages"        # General Syslog fallback
        ]
        for l in standard_logs:
            if l not in candidates and os.path.exists(l):
                candidates.append(l)

        existing = [c for c in candidates if os.path.exists(c)]
        if not existing:
            # Fallback to local buffer file if no system auth logs are present
            fallback = os.path.join(os.path.dirname(__file__), f"mock_{self.vm_id}.log")
            if not os.path.exists(fallback):
                with open(fallback, "w") as f:
                    f.write(f"# VM guest log buffer created for {self.vm_id}\n")
            print(f"[{self.vm_id}] [NOTICE] No system auth logs found. Monitoring local buffer: {fallback}")
            return [fallback]
        return existing

    def monitor_auth_logs(self):
        targets = self._resolve_log_targets()
        print(f"[{self.vm_id}] Monitoring authentic guest logs: {targets}")
        for t in targets:
            if os.path.exists(t):
                self.byte_offsets[t] = os.path.getsize(t)

        while self.is_running:
            for t in targets:
                if not os.path.exists(t):
                    continue
                cur_size = os.path.getsize(t)
                offset = self.byte_offsets.get(t, 0)
                if cur_size < offset:
                    offset = 0  # Log rotated

                if cur_size > offset:
                    with open(t, "r", encoding="utf-8", errors="replace") as f:
                        f.seek(offset)
                        new_data = f.read()
                        self.byte_offsets[t] = f.tell()

                    parsed_events = []
                    for line in new_data.splitlines():
                        evt = self._parse_log_line(line, source_name=os.path.basename(t))
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
                            print(f"[{self.vm_id}] Forwarded {len(parsed_events)} authentic VM log events ({os.path.basename(t)}) to SOC Host")
                        else:
                            self._buffer_events(parsed_events)

            time.sleep(1.0)

    def _parse_log_line(self, line: str, source_name: str = "auth.log") -> Optional[dict]:
        line = line.strip()
        if not line or line.startswith("#"):
            return None

        # Redact raw passwords for privacy compliance
        sanitized_line = re.sub(r"(password[=:\s]+)\S+", r"\1[REDACTED]", line, flags=re.IGNORECASE)
        now = datetime.now(timezone.utc).isoformat()
        default_peer = self.peer_ip or "192.168.56.20"

        # Failed SSH Login / Invalid User Attempts
        if any(kw in line.lower() for kw in ["failed password", "authentication failure", "invalid user"]):
            if "connection closed by invalid user" in line.lower():
                return None
            ip_m = re.search(r"from\s+(\d+\.\d+\.\d+\.\d+)", line)
            user_m = re.search(r"(?:for|user)\s+(?:invalid\s+user\s+)?([a-zA-Z0-9_\-\.]+)", line)
            port_m = re.search(r"port\s+(\d+)", line)
            return {
                "event_type": "authentication",
                "severity": "HIGH",
                "source_ip": ip_m.group(1) if ip_m else default_peer,
                "destination_ip": self.local_ip,
                "destination_port": 22,
                "source_port": int(port_m.group(1)) if port_m else 49152,
                "username": user_m.group(1) if user_m else "unknown",
                "host": self.vm_id,
                "file_action": "FAILED",
                "command_line": sanitized_line,
                "collector_source": source_name,
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
                "source_ip": ip_m.group(1) if ip_m else default_peer,
                "destination_ip": self.local_ip,
                "destination_port": 22,
                "username": user_m.group(1) if user_m else "ubuntu",
                "host": self.vm_id,
                "file_action": "SUCCESS",
                "command_line": sanitized_line,
                "collector_source": source_name,
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
                "source_ip": ip_m.group(1) if ip_m else default_peer,
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
            except Exception:
                pass
            time.sleep(1.0)

    def _parse_nginx_line(self, line: str) -> Optional[dict]:
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

    def _parse_network_packet(self, frame: bytes):
        """Parse inbound IPv4 TCP SYN / UDP metadata, never packet payloads."""
        if len(frame) < 34 or frame[12:14] != b'\x08\x00':
            return None
        header = (frame[14] & 15) * 4
        if header < 20 or len(frame) < 14 + header + 8:
            return None
        source = socket.inet_ntoa(frame[26:30])
        destination = socket.inet_ntoa(frame[30:34])
        
        # Match configured peer IP if specified, otherwise accept non-local source
        if self.peer_ip and source != self.peer_ip:
            return None
        if destination != self.local_ip:
            return None

        # Ignore noninitial IPv4 fragments
        if struct.unpack('!H', frame[20:22])[0] & 0x1fff:
            return None
        protocol = frame[23]
        offset = 14 + header
        if protocol == 6:
            if len(frame) < offset + 20 or frame[offset + 13] & 0x12 != 0x02:
                return None
            name = 'TCP'
        elif protocol == 17:
            name = 'UDP'
        else:
            return None
        source_port, destination_port = struct.unpack('!HH', frame[offset:offset+4])
        length = struct.unpack('!H', frame[16:18])[0]
        return source, destination, source_port, destination_port, name, length

    def monitor_network_packets(self):
        """Raw socket packet capture for Linux guests with raw socket privileges."""
        if not hasattr(socket, "AF_PACKET"):
            return

        # Auto-detect network interface if not specified
        iface = self.network_interface
        if not iface:
            try:
                if os.path.exists("/sys/class/net"):
                    candidates = [
                        i for i in os.listdir("/sys/class/net") 
                        if i != "lo" and not i.startswith("docker") and not i.startswith("veth")
                    ]
                    if candidates:
                        iface = candidates[0]
            except Exception:
                pass
        if not iface:
            iface = "eth0"

        try:
            capture = socket.socket(socket.AF_PACKET, socket.SOCK_RAW, socket.htons(0x0800))
            capture.bind((iface, 0))
            capture.settimeout(0.2)
            print(f"[{self.vm_id}] Raw packet monitor active on interface: {iface}")
        except (OSError, AttributeError, PermissionError) as exc:
            # Informational only; non-root or environments without AF_PACKET fallback cleanly to socket_monitor
            print(f"[{self.vm_id}] Raw packet capture skipped ({exc}). Using active socket monitor.")
            return

        flows = {}
        flush_at = time.monotonic() + 1
        with capture:
            while self.is_running:
                try:
                    packet = self._parse_network_packet(capture.recv(65535))
                    if packet:
                        source, destination, source_port, port, protocol, length = packet
                        key = (source, destination, port, protocol)
                        flow = flows.setdefault(key, {'packets': 0, 'bytes': 0, 'source_port': source_port})
                        flow['packets'] += 1
                        flow['bytes'] += length
                except socket.timeout:
                    pass
                except OSError:
                    return

                if time.monotonic() < flush_at:
                    continue
                events = []
                for (source, destination, port, protocol), flow in flows.items():
                    events.append({
                        'event_type': 'network_connection',
                        'severity': 'LOW',
                        'source_ip': source,
                        'destination_ip': destination,
                        'source_port': flow['source_port'],
                        'destination_port': port,
                        'protocol': protocol,
                        'host': self.vm_id,
                        'collector_source': 'packet_monitor',
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'command_line': f'Observed {flow["packets"]} inbound {protocol} packets from {source} to {destination}:{port}',
                        'raw_payload': json.dumps({'spkts': flow['packets'], 'sbytes': flow['bytes'], 'dur': 1.0, 'proto': protocol.lower(), 'dsport': port}),
                    })
                flows.clear()
                flush_at = time.monotonic() + 1
                if events:
                    response = self._post('/api/vm/telemetry', {'vm_id': self.vm_id, 'events': events})
                    if 'error' in response:
                        self._buffer_events(events)
                    else:
                        self.events_sent += len(events)

    def monitor_network_connections(self):
        """Monitors inbound connections via ss/netstat across any lab subnet (192.168.x.x, 10.x.x.x, 172.16.x.x)."""
        seen_connections = set()
        while self.is_running:
            try:
                cmd = ["ss", "-tuan", "state", "connected", "state", "syn-recv"]
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=3)
                if res.returncode == 0:
                    events = []
                    now = datetime.now(timezone.utc).isoformat()
                    for l in res.stdout.splitlines()[1:]:
                        parts = l.split()
                        if len(parts) >= 5:
                            peer = parts[4]
                            if ":" in peer:
                                p_ip, p_port = peer.rsplit(":", 1)
                                # Capture ANY non-local incoming connection (supports all private lab subnets)
                                if p_ip != self.local_ip and not p_ip.startswith("127.") and p_ip != "0.0.0.0":
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
                                            "command_line": f"Inbound connection from {p_ip}:{p_port} -> port {loc}",
                                            "collector_source": "socket_tracker",
                                            "timestamp": now,
                                            "raw_payload": l
                                        })
                    if events:
                        res = self._post("/api/vm/telemetry", {
                            "vm_id": self.vm_id,
                            "api_key": self.api_key,
                            "events": events
                        })
                        if "error" not in res:
                            self.events_sent += len(events)
                        else:
                            self._buffer_events(events)
            except Exception:
                pass
            if len(seen_connections) > 500:
                seen_connections.clear()
            time.sleep(1.5)

    def start(self):
        print("=" * 70)
        print(f"       MULTI-AGENT AI SOC GUEST TELEMETRY DAEMON: {self.vm_id}")
        print("=" * 70)
        print(f"SOC Host Target:   {self.soc_host_url}")
        print(f"Guest Node IP:     {self.local_ip}")
        print(f"Heartbeat Cadence: {self.heartbeat_interval}s")
        print(f"Monitored Log:     {self.log_path or 'Auto-Detect'}")
        if self.peer_ip:
            print(f"Attacker/Peer IP:  {self.peer_ip}")
        print("=" * 70)

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
        threading.Thread(target=self.monitor_network_packets, daemon=True).start()

        try:
            while self.is_running:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nShutting down guest collector...")
            self.is_running = False


def parse_arguments():
    parser = argparse.ArgumentParser(
        description="SOC Virtual Machine Guest Telemetry Collector Daemon",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    # Positional arguments for 100% backwards compatibility with existing lab scripts
    parser.add_argument("pos_host", nargs="?", default=None, help="SOC Host URL (e.g. http://192.168.56.1:8000)")
    parser.add_argument("pos_vm", nargs="?", default=None, help="VM ID (e.g. vm-server-01)")
    parser.add_argument("pos_key", nargs="?", default=None, help="VM API Authentication Key")
    parser.add_argument("pos_log", nargs="?", default=None, help="Path to auth log file")

    # Named arguments
    parser.add_argument("--host", default=None, help="SOC Host Base URL")
    parser.add_argument("--vm", "--vm-id", dest="vm_id", default=None, help="VM node ID")
    parser.add_argument("--key", "--api-key", dest="api_key", default=None, help="VM API authentication token")
    parser.add_argument("--log", "--log-path", dest="log_path", default=None, help="Target system auth log path")
    parser.add_argument("--ip", default=None, help="Explicit guest IP address")
    parser.add_argument("--peer-ip", default=None, help="Expected attacker/peer IP address")
    parser.add_argument("--interface", default=None, help="Network interface for raw packet capture")
    parser.add_argument("--heartbeat-interval", type=int, default=10, help="Heartbeat interval in seconds")

    args = parser.parse_args()

    # Resolution hierarchy: Named Flag > Positional Argument > Environment Variable > Default
    host = args.host or args.pos_host or os.environ.get("SOC_HOST_URL", "http://127.0.0.1:8000")
    vm = args.vm_id or args.pos_vm or os.environ.get("SOC_VM_ID", "vm-endpoint-01")
    key = args.api_key or args.pos_key or os.environ.get("SOC_API_KEY", "VM-KEY-ENDPOINT-SEC-2026")
    log = args.log_path or args.pos_log or os.environ.get("SOC_LOG_PATH", "/var/log/auth.log")
    ip = args.ip or os.environ.get("SOC_VM_IP")
    peer_ip = args.peer_ip or os.environ.get("SOC_NETWORK_PEER_IP")
    interface = args.interface or os.environ.get("SOC_NETWORK_INTERFACE")

    return {
        "soc_host_url": host,
        "vm_id": vm,
        "api_key": key,
        "log_path": log,
        "configured_ip": ip,
        "peer_ip": peer_ip,
        "network_interface": interface,
        "heartbeat_interval": args.heartbeat_interval
    }


if __name__ == "__main__":
    config = parse_arguments()
    agent = VMGuestCollector(**config)
    agent.start()
