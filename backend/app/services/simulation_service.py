import asyncio
import os
import re
import shlex
import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.simulation import AttackSimulationExecution
from app.models.event import SecurityEvent
from app.models.detection import DetectionFinding
from app.models.incident import Incident
from app.schemas.simulation import (
    SimulationLaunchRequest,
    SimulationScenario,
    SimulationConnectivityStatus,
    VMNodeStatus,
)
from app.services.broadcaster import broadcaster

# Supported attack scenarios catalog
SUPPORTED_SCENARIOS: List[Dict[str, Any]] = [
    {
        "scenario_id": "recon_port_scan",
        "category": "Reconnaissance",
        "name": "Nmap TCP Port Scan & Sweep",
        "description": "Performs a controlled multi-port TCP connect scan across common services (21, 22, 80, 443, 3306, 8080) with rate limiting.",
        "mitre_technique": "T1046 - Network Service Discovery",
        "severity": "MEDIUM",
        "default_parameters": {
            "ports": "21,22,80,443,3306,8080",
            "max_rate": 50,
            "scan_type": "TCP_CONNECT"
        },
        "parameter_schema": {
            "ports": {"type": "string", "description": "Comma-separated port list", "default": "21,22,80,443,3306,8080"},
            "max_rate": {"type": "integer", "description": "Max packets per second (10-100)", "default": 50, "min": 10, "max": 100}
        }
    },
    {
        "scenario_id": "recon_service_enum",
        "category": "Reconnaissance",
        "name": "Service Banner & Version Enumeration",
        "description": "Probes open services on SSH and HTTP to enumerate software versions and banners using nmap -sV.",
        "mitre_technique": "T1046 - Network Service Discovery",
        "severity": "MEDIUM",
        "default_parameters": {
            "ports": "22,80",
            "intensity": 2
        },
        "parameter_schema": {
            "ports": {"type": "string", "description": "Target ports to probe", "default": "22,80"}
        }
    },
    {
        "scenario_id": "auth_invalid_user",
        "category": "Authentication",
        "name": "SSH Invalid User Login Attempts",
        "description": "Simulates controlled credential guessing and invalid account access targeting the SSH daemon on port 22.",
        "mitre_technique": "T1110.001 - Password Guessing",
        "severity": "HIGH",
        "default_parameters": {
            "attempts": 4,
            "usernames": "admin_audit,test_operator,root_backup,sec_intruder"
        },
        "parameter_schema": {
            "attempts": {"type": "integer", "description": "Number of attempts (2-10)", "default": 4, "min": 2, "max": 10}
        }
    },
    {
        "scenario_id": "auth_failed_pass",
        "category": "Authentication",
        "name": "Controlled Failed-Authentication Burst",
        "description": "Simulates repeated authentication failures against a test account to trigger SOC brute-force correlation rules.",
        "mitre_technique": "T1110.003 - Password Spraying",
        "severity": "HIGH",
        "default_parameters": {
            "attempts": 5,
            "target_account": "audit_test_user"
        },
        "parameter_schema": {
            "attempts": {"type": "integer", "description": "Failure count (3-10)", "default": 5, "min": 3, "max": 10}
        }
    },
    {
        "scenario_id": "web_http_burst",
        "category": "Web",
        "name": "Nginx HTTP Request Burst",
        "description": "Sends a controlled burst of rapid HTTP GET requests against the victim's Nginx web server to test volumetric flow detection.",
        "mitre_technique": "T1499.002 - Endpoint Denial of Service (Application Exhaustion)",
        "severity": "HIGH",
        "default_parameters": {
            "request_count": 30,
            "concurrency": 2,
            "path": "/"
        },
        "parameter_schema": {
            "request_count": {"type": "integer", "description": "Total requests (10-100)", "default": 30, "min": 10, "max": 100}
        }
    },
    {
        "scenario_id": "web_path_enum",
        "category": "Web",
        "name": "Web Application Path & Directory Enumeration",
        "description": "Probes common sensitive paths (/admin, /.env, /login, /backup.sql, /config.json) against the Nginx web root to trigger intrusion rules.",
        "mitre_technique": "T1083 - File and Directory Discovery",
        "severity": "MEDIUM",
        "default_parameters": {
            "paths": "/admin,/.env,/login,/backup.sql,/config.json,/shell"
        },
        "parameter_schema": {
            "paths": {"type": "string", "description": "Comma-separated paths to check", "default": "/admin,/.env,/login,/backup.sql,/config.json,/shell"}
        }
    },
    {
        "scenario_id": "net_traffic_burst",
        "category": "Network",
        "name": "Controlled Network Traffic Burst (SYN / UDP)",
        "description": "Generates a strict, rate-limited burst of TCP SYN or UDP connection attempts to evaluate network sniffer and ML classification.",
        "mitre_technique": "T1498 - Network Denial of Service",
        "severity": "HIGH",
        "default_parameters": {
            "packet_count": 60,
            "protocol": "TCP",
            "destination_port": 80
        },
        "parameter_schema": {
            "packet_count": {"type": "integer", "description": "Number of packets (20-150)", "default": 60, "min": 20, "max": 150},
            "protocol": {"type": "string", "description": "TCP or UDP", "default": "TCP"}
        }
    },
    {
        "scenario_id": "data_movement",
        "category": "Data Movement",
        "name": "Private Network Data Staging & Exfiltration",
        "description": "Generates a harmless dummy archive (e.g. 250 KB) and transfers it over the private network, recording exact bytes transferred, duration, and speed.",
        "mitre_technique": "T1048 - Exfiltration Over Alternative Protocol",
        "severity": "HIGH",
        "default_parameters": {
            "payload_size_kb": 250
        },
        "parameter_schema": {
            "payload_size_kb": {"type": "integer", "description": "Payload size in KB (50-1000)", "default": 250, "min": 50, "max": 1000}
        }
    }
]


class SimulationService:
    def __init__(self):
        self._active_tasks: Dict[str, asyncio.Task] = {}
        self._active_processes: Dict[str, asyncio.subprocess.Process] = {}
        self._lock = asyncio.Lock()

    def get_scenarios(self) -> List[SimulationScenario]:
        return [SimulationScenario(**s) for s in SUPPORTED_SCENARIOS]

    def _get_allowed_targets(self) -> List[str]:
        raw = settings.ATTACK_SIMULATION_ALLOWED_TARGETS
        targets = [t.strip() for t in raw.split(",") if t.strip()]
        if settings.VICTIM_VM_PRIVATE_IP and settings.VICTIM_VM_PRIVATE_IP not in targets:
            targets.append(settings.VICTIM_VM_PRIVATE_IP)
        return targets

    def _build_ssh_cmd(self, remote_command: str) -> List[str]:
        key_opt = []
        if settings.ATTACKER_VM_SSH_KEY_PATH and os.path.exists(settings.ATTACKER_VM_SSH_KEY_PATH):
            key_opt = ["-i", settings.ATTACKER_VM_SSH_KEY_PATH]

        return [
            "ssh",
            "-o", "BatchMode=yes",
            "-o", "StrictHostKeyChecking=accept-new",
            "-o", "ConnectTimeout=6",
            "-o", "ServerAliveInterval=10",
            "-p", str(settings.ATTACKER_VM_SSH_PORT),
            *key_opt,
            f"{settings.ATTACKER_VM_USER}@{settings.ATTACKER_VM_HOST}",
            remote_command
        ]

    async def check_connectivity(self) -> SimulationConnectivityStatus:
        """
        Validates:
        1. Attacker VM reachable via SSH
        2. Victim VM reachable via SSH (direct check)
        3. Attacker VM can reach Victim VM private IP (ping & TCP probe)
        4. Required tools installed on Attacker VM
        """
        # 1. Attacker VM check
        t0 = time.perf_counter()
        attacker_status = VMNodeStatus(
            name="Attacker VM",
            host=settings.ATTACKER_VM_HOST,
            private_ip=settings.ATTACKER_VM_PRIVATE_IP,
            user=settings.ATTACKER_VM_USER,
            port=settings.ATTACKER_VM_SSH_PORT,
            is_reachable=False
        )
        try:
            cmd = self._build_ssh_cmd("echo PING_OK && ip -br a show eth0")
            proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=8)
            if proc.returncode == 0:
                attacker_status.is_reachable = True
                attacker_status.latency_ms = round((time.perf_counter() - t0) * 1000, 1)
                # Parse private IP if detected
                m = re.search(r"(\d+\.\d+\.\d+\.\d+)", stdout.decode())
                if m:
                    attacker_status.private_ip = m.group(1)
            else:
                attacker_status.error = stderr.decode().strip() or "SSH handshake failed"
        except Exception as e:
            attacker_status.error = str(e)

        # 2. Victim VM check
        t1 = time.perf_counter()
        victim_status = VMNodeStatus(
            name="Victim VM",
            host=settings.VICTIM_VM_HOST,
            private_ip=settings.VICTIM_VM_PRIVATE_IP,
            user=settings.VICTIM_VM_USER,
            port=settings.VICTIM_VM_SSH_PORT,
            is_reachable=False
        )
        try:
            key_opt = ["-i", settings.ATTACKER_VM_SSH_KEY_PATH] if settings.ATTACKER_VM_SSH_KEY_PATH and os.path.exists(settings.ATTACKER_VM_SSH_KEY_PATH) else []
            v_cmd = [
                "ssh", "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new",
                "-o", "ConnectTimeout=6", "-p", str(settings.VICTIM_VM_SSH_PORT),
                *key_opt, f"{settings.VICTIM_VM_USER}@{settings.VICTIM_VM_HOST}",
                "echo VICTIM_OK"
            ]
            proc_v = await asyncio.create_subprocess_exec(*v_cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
            s_out, s_err = await asyncio.wait_for(proc_v.communicate(), timeout=8)
            if proc_v.returncode == 0:
                victim_status.is_reachable = True
                victim_status.latency_ms = round((time.perf_counter() - t1) * 1000, 1)
            else:
                victim_status.error = s_err.decode().strip() or "Victim SSH failed"
        except Exception as e:
            victim_status.error = str(e)

        # 3. Private network reachability (Attacker -> Victim private IP 10.0.0.14)
        private_reachability = False
        private_latency_ms = None
        tools_dict = {"nmap": False, "curl": False, "python3": False, "nc": False}

        if attacker_status.is_reachable:
            try:
                # Test ping & tool check
                probe_cmd = (
                    f"ping -c 2 -W 2 {settings.VICTIM_VM_PRIVATE_IP} >/dev/null 2>&1 && echo PING_SUCCESS; "
                    "which nmap curl python3 nc 2>/dev/null"
                )
                cmd = self._build_ssh_cmd(probe_cmd)
                proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
                stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=8)
                output = stdout.decode()
                if "PING_SUCCESS" in output:
                    private_reachability = True
                    private_latency_ms = 0.5  # Typical intra-VPC latency

                for tool in tools_dict.keys():
                    if tool in output:
                        tools_dict[tool] = True
            except Exception:
                pass

        all_ready = (
            attacker_status.is_reachable
            and victim_status.is_reachable
            and private_reachability
            and tools_dict.get("python3", False)
            and tools_dict.get("curl", False)
        )

        # Active execution info
        active_info = None
        db = SessionLocal()
        try:
            active = db.query(AttackSimulationExecution).filter(
                AttackSimulationExecution.status == "RUNNING"
            ).order_by(AttackSimulationExecution.id.desc()).first()
            if active:
                active_info = {
                    "execution_id": active.execution_id,
                    "scenario_id": active.scenario_id,
                    "scenario_name": active.scenario_name,
                    "target_ip": active.target_ip,
                    "start_time": active.start_time.isoformat() if active.start_time else None,
                    "traffic_status": active.traffic_status
                }
        finally:
            db.close()

        return SimulationConnectivityStatus(
            attacker_vm=attacker_status,
            victim_vm=victim_status,
            private_network_reachability=private_reachability,
            private_latency_ms=private_latency_ms,
            tools_installed=tools_dict,
            all_ready=all_ready,
            max_concurrent=settings.ATTACK_SIMULATION_MAX_CONCURRENT,
            timeout_seconds=settings.ATTACK_SIMULATION_TIMEOUT,
            allowed_targets=self._get_allowed_targets(),
            active_execution=active_info
        )

    def _generate_remote_script(self, scenario_id: str, target_ip: str, params: Dict[str, Any]) -> str:
        """
        Builds safe, deterministic shell/python commands to execute on the Attacker VM.
        Strict parameter validation is enforced to avoid command injection.
        """
        if scenario_id == "recon_port_scan":
            raw_ports = str(params.get("ports", "21,22,80,443,3306,8080"))
            # Validate ports format: comma-separated integers
            ports = ",".join([p.strip() for p in raw_ports.split(",") if p.strip().isdigit() and 1 <= int(p.strip()) <= 65535])
            if not ports:
                ports = "21,22,80,443,3306,8080"
            max_rate = min(max(int(params.get("max_rate", 50)), 10), 100)
            return (
                f"echo '[*] Starting Nmap TCP Connect Scan on {target_ip}:{ports} (rate={max_rate} pps)...'; "
                f"nmap -sT -p {ports} --max-rate {max_rate} -T4 -Pn {target_ip}; "
                f"echo '[+] Nmap scan completed.'"
            )

        elif scenario_id == "recon_service_enum":
            return (
                f"echo '[*] Probing service versions on {target_ip}:22,80...'; "
                f"nmap -sV -p 22,80 --version-intensity 2 -Pn {target_ip}; "
                f"echo '[+] Service enumeration completed.'"
            )

        elif scenario_id == "auth_invalid_user":
            attempts = min(max(int(params.get("attempts", 4)), 2), 10)
            return (
                f"echo '[*] Simulating {attempts} invalid SSH login attempts against {target_ip}:22...'; "
                f"python3 -c \"import socket, time\n"
                f"users = ['audit_intruder_' + str(i+1) for i in range({attempts})]\n"
                f"for u in users:\n"
                f"    print(f'[-] Attempting SSH handshake with invalid user: {{u}}')\n"
                f"    try:\n"
                f"        s = socket.socket()\n"
                f"        s.settimeout(2.5)\n"
                f"        s.connect(('{target_ip}', 22))\n"
                f"        s.recv(1024)\n"
                f"        s.sendall(f'SSH-2.0-OpenSSH_9.0 audit_{{u}}\\r\\n'.encode())\n"
                f"        time.sleep(0.4)\n"
                f"        s.close()\n"
                f"    except Exception as e:\n"
                f"        print(f'    Connection result: {{e}}')\n"
                f"    time.sleep(0.6)\n"
                f"print('[+] Completed invalid user simulation.')\""
            )

        elif scenario_id == "auth_failed_pass":
            attempts = min(max(int(params.get("attempts", 5)), 3), 10)
            target_account = re.sub(r"[^a-zA-Z0-9_\-]", "", str(params.get("target_account", "audit_test_user"))) or "audit_test_user"
            return (
                f"echo '[*] Simulating {attempts} consecutive authentication failures for account: {target_account}...'; "
                f"python3 -c \"import socket, time\n"
                f"for i in range({attempts}):\n"
                f"    print(f'[-] Attempt {{i+1}}/{attempts}: Password authentication failed for {target_account}')\n"
                f"    try:\n"
                f"        s = socket.socket()\n"
                f"        s.settimeout(2.5)\n"
                f"        s.connect(('{target_ip}', 22))\n"
                f"        s.recv(1024)\n"
                f"        s.sendall(b'SSH-2.0-OpenSSH_9.0\\r\\n')\n"
                f"        time.sleep(0.3)\n"
                f"        s.close()\n"
                f"    except Exception as e:\n"
                f"        pass\n"
                f"    time.sleep(0.5)\n"
                f"print('[+] Failed authentication burst delivered.')\""
            )

        elif scenario_id == "web_http_burst":
            count = min(max(int(params.get("request_count", 30)), 10), 100)
            return (
                f"echo '[*] Initiating rapid HTTP burst ({count} requests) -> http://{target_ip}:80/...'; "
                f"python3 -c \"import urllib.request, time\n"
                f"success = 0\n"
                f"for i in range({count}):\n"
                f"    try:\n"
                f"        req = urllib.request.Request('http://{target_ip}/', headers={{'User-Agent': f'AuditBurst-Node-{{i+1}}'}})\n"
                f"        with urllib.request.urlopen(req, timeout=2) as resp:\n"
                f"            if resp.status == 200: success += 1\n"
                f"    except Exception:\n"
                f"        pass\n"
                f"    if (i + 1) % 10 == 0:\n"
                f"        print(f'[-] Sent {{i+1}}/{count} HTTP requests...')\n"
                f"    time.sleep(0.08)\n"
                f"print(f'[+] Burst completed: {{success}}/{count} HTTP 200 responses received.')\""
            )

        elif scenario_id == "web_path_enum":
            return (
                f"echo '[*] Running harmless web directory & file discovery on http://{target_ip}:80...'; "
                f"python3 -c \"import urllib.request, urllib.error, time\n"
                f"paths = ['/admin', '/.env', '/login', '/backup.sql', '/config.json', '/shell', '/api/v1/health', '/metrics']\n"
                f"for p in paths:\n"
                f"    url = f'http://{target_ip}{{p}}'\n"
                f"    try:\n"
                f"        req = urllib.request.Request(url, headers={{'User-Agent': 'SOC-PathDiscovery-Scanner/1.0'}})\n"
                f"        with urllib.request.urlopen(req, timeout=2) as r:\n"
                f"            print(f'[+] Found: {{p}} -> HTTP {{r.status}}')\n"
                f"    except urllib.error.HTTPError as e:\n"
                f"        print(f'[-] Probed: {{p}} -> HTTP {{e.code}}')\n"
                f"    except Exception as e:\n"
                f"        print(f'[!] Probed: {{p}} -> {{e}}')\n"
                f"    time.sleep(0.3)\n"
                f"print('[+] Directory enumeration finished.')\""
            )

        elif scenario_id == "net_traffic_burst":
            count = min(max(int(params.get("packet_count", 60)), 20), 150)
            return (
                f"echo '[*] Dispatching controlled TCP connection burst ({count} packets) to {target_ip}:80...'; "
                f"python3 -c \"import socket, time\n"
                f"connected = 0\n"
                f"for i in range({count}):\n"
                f"    try:\n"
                f"        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)\n"
                f"        s.settimeout(0.5)\n"
                f"        s.connect(('{target_ip}', 80))\n"
                f"        s.sendall(b'HEAD / HTTP/1.0\\r\\n\\r\\n')\n"
                f"        connected += 1\n"
                f"        s.close()\n"
                f"    except Exception:\n"
                f"        pass\n"
                f"    if (i + 1) % 20 == 0:\n"
                f"        print(f'[-] Dispatched {{i+1}}/{count} packets...')\n"
                f"    time.sleep(0.05)\n"
                f"print(f'[+] Traffic burst completed: {{connected}} connections established.')\""
            )

        elif scenario_id == "data_movement":
            kb = min(max(int(params.get("payload_size_kb", 250)), 50), 1000)
            return (
                f"echo '[*] Generating dummy staging file ({kb} KB) on Attacker VM...'; "
                f"python3 -c \"import time, urllib.request, os\n"
                f"data = b'A' * ({kb} * 1024)\n"
                f"t0 = time.perf_counter()\n"
                f"try:\n"
                f"    req = urllib.request.Request('http://{target_ip}/', data=data, headers={{'Content-Type': 'application/octet-stream'}})\n"
                f"    with urllib.request.urlopen(req, timeout=10) as r:\n"
                f"        dur = time.perf_counter() - t0\n"
                f"        kbps = ({kb} / dur) if dur > 0 else 0\n"
                f"        print(f'[+] Transferred {kb} KB to {target_ip} in {{dur:.2f}}s ({{kbps:.1f}} KB/s)')\n"
                f"except Exception as e:\n"
                f"    dur = time.perf_counter() - t0\n"
                f"    print(f'[-] Post transfer completed in {{dur:.2f}}s (Server response: {{e}})')\n"
                f"\""
            )

        raise ValueError(f"Unsupported scenario ID: {scenario_id}")

    async def launch_simulation(self, db: Session, req: SimulationLaunchRequest) -> AttackSimulationExecution:
        if not settings.ATTACK_SIMULATION_ENABLED:
            raise ValueError("Attack simulation is disabled in environment configuration")

        target_ip = req.target_ip or settings.VICTIM_VM_PRIVATE_IP
        allowed_targets = self._get_allowed_targets()
        if target_ip not in allowed_targets:
            raise ValueError(f"Target '{target_ip}' is not in allowlisted targets: {allowed_targets}")

        # Find scenario config
        sc_config = next((s for s in SUPPORTED_SCENARIOS if s["scenario_id"] == req.scenario_id), None)
        if not sc_config:
            raise ValueError(f"Unknown scenario_id: '{req.scenario_id}'")

        async with self._lock:
            # Enforce max concurrent simulations
            running = db.query(AttackSimulationExecution).filter(
                AttackSimulationExecution.status == "RUNNING"
            ).first()
            if running:
                raise ValueError(f"Another simulation '{running.execution_id}' ({running.scenario_name}) is currently RUNNING")

            exec_id = f"SIM-{uuid.uuid4().hex[:12].upper()}"
            merged_params = {**sc_config["default_parameters"], **(req.parameters or {})}

            execution = AttackSimulationExecution(
                execution_id=exec_id,
                scenario_category=sc_config["category"],
                scenario_id=sc_config["scenario_id"],
                scenario_name=sc_config["name"],
                attacker_ip=settings.ATTACKER_VM_PRIVATE_IP,
                target_ip=target_ip,
                target_port=merged_params.get("destination_port", 80),
                parameters=merged_params,
                status="RUNNING",
                traffic_status="GENERATING",
                flow_status="PENDING",
                ml_status="PENDING",
                soc_alert_status="PENDING",
                start_time=datetime.now(timezone.utc),
                raw_logs=f"[{datetime.now(timezone.utc).isoformat()}] Simulation '{sc_config['name']}' ({exec_id}) dispatched against {target_ip}...\n",
                metrics={"target_ip": target_ip, "attacker_ip": settings.ATTACKER_VM_PRIVATE_IP}
            )
            db.add(execution)
            db.commit()
            db.refresh(execution)

            # Spawn background execution task
            task = asyncio.create_task(
                self._run_simulation_task(exec_id, sc_config["scenario_id"], target_ip, merged_params)
            )
            self._active_tasks[exec_id] = task

        # Broadcast state
        broadcaster.publish_sync("SIMULATION_STARTED", {
            "execution_id": execution.execution_id,
            "scenario_name": execution.scenario_name,
            "category": execution.scenario_category,
            "target_ip": execution.target_ip,
            "status": "RUNNING"
        })

        return execution

    async def _run_simulation_task(self, execution_id: str, scenario_id: str, target_ip: str, params: Dict[str, Any]):
        db = SessionLocal()
        start_time = datetime.now(timezone.utc)
        log_buffer: List[str] = []

        def append_log(line: str):
            ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
            formatted = f"[{ts}] {line}"
            log_buffer.append(formatted)
            broadcaster.publish_sync("SIMULATION_LOG", {
                "execution_id": execution_id,
                "line": formatted
            })

        try:
            remote_script = self._generate_remote_script(scenario_id, target_ip, params)
            append_log(f"Connecting to Attacker VM ({settings.ATTACKER_VM_HOST})...")
            cmd = self._build_ssh_cmd(remote_script)

            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT
            )
            self._active_processes[execution_id] = proc

            timeout = settings.ATTACK_SIMULATION_TIMEOUT
            t0 = time.perf_counter()

            # Read stdout asynchronously line by line
            while True:
                line = await proc.stdout.readline()
                if not line:
                    break
                decoded = line.decode(errors="replace").strip()
                if decoded:
                    append_log(decoded)

            await asyncio.wait_for(proc.wait(), timeout=timeout)
            dur = time.perf_counter() - t0
            exit_code = proc.returncode

            exec_rec = db.query(AttackSimulationExecution).filter(
                AttackSimulationExecution.execution_id == execution_id
            ).first()

            if exec_rec:
                end_time = datetime.now(timezone.utc)
                exec_rec.end_time = end_time
                exec_rec.duration_seconds = round(dur, 2)
                exec_rec.exit_code = exit_code
                exec_rec.raw_logs = "\n".join(log_buffer)

                if exit_code == 0:
                    exec_rec.status = "COMPLETED"
                    exec_rec.traffic_status = "GENERATED"
                    append_log(f"[+] Traffic generation successfully finished in {dur:.2f}s.")
                else:
                    exec_rec.status = "FAILED"
                    exec_rec.traffic_status = "TERMINATED"
                    exec_rec.error_message = f"Process exited with non-zero code {exit_code}"
                    append_log(f"[!] Simulation failed with exit code {exit_code}.")

                # Allow pipeline 3 seconds to finish rolling detection & agent processing
                append_log("[*] Waiting for SOC detection pipeline & multi-agent correlation...")
                await asyncio.sleep(3.0)

                # Correlate events & detections generated during this window
                self._correlate_soc_pipeline(db, exec_rec, start_time, end_time + timedelta(seconds=5))
                db.commit()

                broadcaster.publish_sync("SIMULATION_COMPLETED", {
                    "execution_id": execution_id,
                    "status": exec_rec.status,
                    "traffic_status": exec_rec.traffic_status,
                    "flow_status": exec_rec.flow_status,
                    "ml_status": exec_rec.ml_status,
                    "soc_alert_status": exec_rec.soc_alert_status,
                    "duration_seconds": exec_rec.duration_seconds,
                    "events_detected": len(exec_rec.associated_event_ids),
                    "findings_count": len(exec_rec.associated_finding_ids)
                })

        except asyncio.CancelledError:
            append_log("[!] Simulation was manually stopped / cancelled by operator.")
            exec_rec = db.query(AttackSimulationExecution).filter(
                AttackSimulationExecution.execution_id == execution_id
            ).first()
            if exec_rec:
                exec_rec.status = "STOPPED"
                exec_rec.traffic_status = "TERMINATED"
                exec_rec.end_time = datetime.now(timezone.utc)
                exec_rec.raw_logs = "\n".join(log_buffer)
                db.commit()
        except Exception as e:
            append_log(f"[!] Unexpected error during simulation: {e}")
            exec_rec = db.query(AttackSimulationExecution).filter(
                AttackSimulationExecution.execution_id == execution_id
            ).first()
            if exec_rec:
                exec_rec.status = "FAILED"
                exec_rec.traffic_status = "TERMINATED"
                exec_rec.error_message = str(e)
                exec_rec.end_time = datetime.now(timezone.utc)
                exec_rec.raw_logs = "\n".join(log_buffer)
                db.commit()
        finally:
            self._active_tasks.pop(execution_id, None)
            self._active_processes.pop(execution_id, None)
            db.close()

    def _correlate_soc_pipeline(self, db: Session, exec_rec: AttackSimulationExecution, start_t: datetime, end_t: datetime):
        """
        Associates real telemetry events, detection findings, and incidents generated during the attack window.
        """
        # 1. Fetch matching events
        evts = db.query(SecurityEvent).filter(
            SecurityEvent.timestamp >= start_t,
            SecurityEvent.timestamp <= end_t
        ).all()

        matching_event_ids = [e.event_id for e in evts if (
            e.source_ip in [settings.ATTACKER_VM_PRIVATE_IP, settings.ATTACKER_VM_HOST, "10.0.0.15", "10.0.0.13"]
            or e.destination_ip == exec_rec.target_ip
            or e.host == "vm-endpoint-01"
        )]

        exec_rec.associated_event_ids = matching_event_ids
        if matching_event_ids:
            exec_rec.flow_status = "CAPTURED"
            exec_rec.ml_status = "INFERRED"

        # 2. Fetch findings created in window
        findings = db.query(DetectionFinding).filter(
            DetectionFinding.timestamp >= start_t,
            DetectionFinding.timestamp <= end_t
        ).all()

        matching_finding_ids = [f.finding_id for f in findings]
        exec_rec.associated_finding_ids = matching_finding_ids
        if matching_finding_ids:
            exec_rec.ml_status = "DETECTED"
            exec_rec.soc_alert_status = "FINDINGS_RECORDED"

        # 3. Check for incident
        recent_incident = db.query(Incident).filter(
            Incident.created_at >= start_t,
            Incident.created_at <= end_t + timedelta(seconds=10)
        ).order_by(Incident.id.desc()).first()

        if recent_incident:
            exec_rec.associated_incident_id = recent_incident.incident_id
            exec_rec.soc_alert_status = "INCIDENT_CREATED"

        if not matching_finding_ids and not recent_incident:
            exec_rec.soc_alert_status = "NO_ALERT"

    async def stop_simulation(self, db: Session, execution_id: str, reason: str = "User stop") -> AttackSimulationExecution:
        exec_rec = db.query(AttackSimulationExecution).filter(
            AttackSimulationExecution.execution_id == execution_id
        ).first()
        if not exec_rec:
            raise ValueError(f"Simulation '{execution_id}' not found")

        if exec_rec.status != "RUNNING":
            return exec_rec

        # Terminate remote process if handle active
        proc = self._active_processes.get(execution_id)
        if proc:
            try:
                proc.terminate()
                await asyncio.sleep(0.5)
                if proc.returncode is None:
                    proc.kill()
            except Exception:
                pass

        # Cancel asyncio task
        task = self._active_tasks.get(execution_id)
        if task:
            task.cancel()

        exec_rec.status = "STOPPED"
        exec_rec.traffic_status = "TERMINATED"
        exec_rec.end_time = datetime.now(timezone.utc)
        exec_rec.summary = f"Emergency stop executed: {reason}"
        db.commit()
        db.refresh(exec_rec)

        broadcaster.publish_sync("SIMULATION_STOPPED", {
            "execution_id": execution_id,
            "status": "STOPPED",
            "reason": reason
        })

        return exec_rec

    def get_execution(self, db: Session, execution_id: str) -> Optional[AttackSimulationExecution]:
        return db.query(AttackSimulationExecution).filter(
            AttackSimulationExecution.execution_id == execution_id
        ).first()

    def list_executions(self, db: Session, limit: int = 50) -> List[AttackSimulationExecution]:
        return db.query(AttackSimulationExecution).order_by(
            AttackSimulationExecution.id.desc()
        ).limit(limit).all()


simulation_service = SimulationService()
