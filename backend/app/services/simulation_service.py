import asyncio
import ipaddress
import json
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
from app.models.incident import Incident, IncidentEvent
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
        "scenario_id": "net_traffic_burst",
        "category": "Network",
        "name": "Controlled TCP / UDP Traffic Burst",
        "description": "Sends a bounded burst of TCP connections or UDP datagrams to the chosen private destination port. Victim packet telemetry records the traffic.",
        "mitre_technique": "T1498 - Network Denial of Service",
        "severity": "HIGH",
        "default_parameters": {
            "packet_count": 60,
            "protocol": "TCP",
            "destination_port": 80
        },
        "parameter_schema": {
            "packet_count": {"type": "integer", "description": "Number of packets (20-150)", "default": 60, "min": 20, "max": 150},
            "protocol": {"type": "string", "description": "TCP or UDP", "default": "TCP", "enum": ["TCP", "UDP"]},
            "destination_port": {"type": "integer", "description": "Victim destination port", "default": 80, "min": 1, "max": 65535}
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

    async def _ssh_output(self, command: List[str], timeout: float = 10):
        proc = await asyncio.create_subprocess_exec(*command, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
            return proc.returncode, stdout.decode(), stderr.decode()
        finally:
            if proc.returncode is None:
                proc.kill()
                await proc.wait()

    async def check_connectivity(self) -> SimulationConnectivityStatus:
        # One SSH connection per VM, checked concurrently. Probe the actual HTTP route.
        target = str(ipaddress.ip_address(settings.VICTIM_VM_PRIVATE_IP))
        probe = f"""import json, shutil, socket, time
result = {{'tools': {{name: bool(shutil.which(name)) for name in ['nmap', 'curl', 'python3', 'nc']}}, 'http_reachable': False}}
try:
    start = time.perf_counter()
    with socket.create_connection(({target!r}, 80), timeout=3):
        result['http_reachable'] = True
        result['private_latency_ms'] = round((time.perf_counter() - start) * 1000, 2)
except OSError:
    pass
print(json.dumps(result))
"""
        attacker = VMNodeStatus(name="Attacker VM", host=settings.ATTACKER_VM_HOST,
            private_ip=settings.ATTACKER_VM_PRIVATE_IP, user=settings.ATTACKER_VM_USER,
            port=settings.ATTACKER_VM_SSH_PORT, is_reachable=False)
        victim = VMNodeStatus(name="Victim VM", host=settings.VICTIM_VM_HOST,
            private_ip=settings.VICTIM_VM_PRIVATE_IP, user=settings.VICTIM_VM_USER,
            port=settings.VICTIM_VM_SSH_PORT, is_reachable=False)
        victim_cmd = self._build_ssh_cmd("echo VICTIM_OK")
        victim_cmd[victim_cmd.index('-p') + 1] = str(settings.VICTIM_VM_SSH_PORT)
        victim_cmd[-2] = f"{settings.VICTIM_VM_USER}@{settings.VICTIM_VM_HOST}"

        async def check(node, command):
            start = time.perf_counter()
            try:
                code, out, err = await self._ssh_output(command)
                node.is_reachable = code == 0
                node.latency_ms = round((time.perf_counter() - start) * 1000, 1)
                node.error = None if code == 0 else err.strip() or "SSH failed"
                return out if code == 0 else ""
            except Exception as exc:
                node.error = str(exc) or type(exc).__name__
                return ""

        attacker_output, _ = await asyncio.gather(
            check(attacker, self._build_ssh_cmd('python3 -u -c ' + shlex.quote(probe))),
            check(victim, victim_cmd),
        )
        try:
            result = json.loads(attacker_output)
        except (ValueError, TypeError):
            result = {}
        tools = result.get('tools', {name: False for name in ('nmap', 'curl', 'python3', 'nc')})
        route_ready = result.get('http_reachable', False)
        db = SessionLocal()
        try:
            active = db.query(AttackSimulationExecution).filter_by(status="RUNNING").order_by(AttackSimulationExecution.id.desc()).first()
            active_info = {"execution_id": active.execution_id, "scenario_id": active.scenario_id,
                "scenario_name": active.scenario_name, "target_ip": active.target_ip,
                "traffic_status": active.traffic_status} if active else None
        finally:
            db.close()
        return SimulationConnectivityStatus(attacker_vm=attacker, victim_vm=victim,
            private_network_reachability=route_ready, private_latency_ms=result.get('private_latency_ms'),
            tools_installed=tools, all_ready=attacker.is_reachable and victim.is_reachable and route_ready and all(tools.values()),
            max_concurrent=settings.ATTACK_SIMULATION_MAX_CONCURRENT, timeout_seconds=settings.ATTACK_SIMULATION_TIMEOUT,
            allowed_targets=self._get_allowed_targets(), active_execution=active_info)

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
                f"python3 -u -c \"import socket, time\n"
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

        elif scenario_id == "web_http_burst":
            count = min(max(int(params.get("request_count", 30)), 10), 100)
            return (
                f"echo '[*] Initiating rapid HTTP burst ({count} requests) -> http://{target_ip}:80/...'; "
                f"python3 -u -c \"import urllib.request, time\n"
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

        elif scenario_id == "net_traffic_burst":
            target_ip = str(ipaddress.ip_address(target_ip))
            count = min(max(int(params.get("packet_count", 60)), 20), 150)
            protocol = str(params.get("protocol", "TCP")).upper()
            if protocol not in {"TCP", "UDP"}:
                raise ValueError("Network protocol must be TCP or UDP")
            port = int(params.get("destination_port", 80))
            if not 1 <= port <= 65535:
                raise ValueError("Destination port must be between 1 and 65535")
            script = f"""import json, socket, sys, time
count, protocol, port, target = {count}, {protocol!r}, {port}, {target_ip!r}
sent = failed = 0
print(f'[*] Sending {{count}} bounded {{protocol}} attempts to {{target}}:{{port}} (20 per second)', flush=True)
for i in range(count):
    try:
        if protocol == 'TCP':
            with socket.create_connection((target, port), timeout=0.5) as sock:
                if port == 80:
                    sock.sendall(f'GET /?soc_network_burst={{i+1}} HTTP/1.1\\r\\nHost: {{target}}\\r\\nConnection: close\\r\\n\\r\\n'.encode())
                    sock.recv(1024)
        else:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
                sock.sendto(b'SOC authorized lab UDP check', (target, port))
        sent += 1
    except OSError as exc:
        failed += 1
        if failed == 1: print(f'[!] First connection error: {{exc}}', flush=True)
    if (i+1) % 10 == 0: print(f'[*] Progress: {{i+1}}/{{count}}; successful={{sent}}; failed={{failed}}', flush=True)
    time.sleep(0.05)
print('SOC_METRICS=' + json.dumps({{'protocol': protocol, 'destination_port': port, 'attempted': count, 'sent': sent, 'failed': failed}}), flush=True)
if protocol == 'UDP': print('[+] UDP datagrams submitted locally; verify delivery using victim packet telemetry.', flush=True)
else: print(f'[+] TCP burst finished: {{sent}}/{{count}} connections succeeded.', flush=True)
sys.exit(0 if sent else 1)
"""
            return 'python3 -u -c ' + shlex.quote(script)

        elif scenario_id == "data_movement":
            kb = min(max(int(params.get("payload_size_kb", 250)), 50), 1000)
            return (
                f"echo '[*] Generating dummy staging file ({kb} KB) on Attacker VM...'; "
                f"python3 -u -c \"import time, urllib.request, os\n"
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

            self._generate_remote_script(req.scenario_id, target_ip, merged_params)

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

            # Apply the deadline to output reading too; silent children must not run forever.
            async with asyncio.timeout(timeout):
                while True:
                    line = await proc.stdout.readline()
                    if not line:
                        break
                    decoded = line.decode(errors="replace").strip()
                    if decoded:
                        append_log(decoded)
                await proc.wait()
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

                for line in log_buffer:
                    if 'SOC_METRICS=' in line:
                        try:
                            exec_rec.metrics = {**(exec_rec.metrics or {}), **json.loads(line.split('SOC_METRICS=', 1)[1])}
                        except ValueError:
                            pass

                # Allow pipeline 3 seconds to finish rolling detection & agent processing
                append_log("[*] Waiting for SOC detection pipeline & multi-agent correlation...")
                await asyncio.sleep(3.0)

                # Correlate events & detections generated during this window
                self._correlate_soc_pipeline(db, exec_rec, start_time, end_time + timedelta(seconds=5))
                exec_rec.raw_logs = "\n".join(log_buffer)
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
            append_log(f"[!] Simulation failed: {str(e) or type(e).__name__}")
            exec_rec = db.query(AttackSimulationExecution).filter(
                AttackSimulationExecution.execution_id == execution_id
            ).first()
            if exec_rec:
                exec_rec.status = "FAILED"
                exec_rec.traffic_status = "TERMINATED"
                exec_rec.error_message = str(e) or type(e).__name__
                exec_rec.end_time = datetime.now(timezone.utc)
                exec_rec.raw_logs = "\n".join(log_buffer)
                db.commit()
        finally:
            proc = self._active_processes.get(execution_id)
            if proc and proc.returncode is None:
                proc.kill()
                await proc.wait()
            self._active_tasks.pop(execution_id, None)
            self._active_processes.pop(execution_id, None)
            db.close()

    def _correlate_soc_pipeline(self, db: Session, exec_rec: AttackSimulationExecution, start_t: datetime, end_t: datetime):
        """Link only authentic traffic from this attacker to this victim and its evidence."""
        from app.services.time_utils import ensure_utc
        events = db.query(SecurityEvent).filter(
            SecurityEvent.ingested_at >= ensure_utc(start_t),
            SecurityEvent.ingested_at <= ensure_utc(end_t),
            SecurityEvent.is_simulated.is_(False),
            SecurityEvent.source_ip == exec_rec.attacker_ip,
            SecurityEvent.destination_ip == exec_rec.target_ip,
        ).all()
        event_ids = {event.event_id for event in events}
        exec_rec.associated_event_ids = sorted(event_ids)
        exec_rec.flow_status = "CAPTURED" if event_ids else "PENDING"
        processed = any(event.processing_status == "PROCESSED" for event in events)
        exec_rec.ml_status = "INFERRED" if processed else "PENDING"
        findings = db.query(DetectionFinding).filter(DetectionFinding.timestamp >= start_t).all() if event_ids else []
        linked_findings = [finding for finding in findings if event_ids.intersection((finding.evidence or {}).get('event_ids', []))]
        exec_rec.associated_finding_ids = [finding.finding_id for finding in linked_findings]
        if any(finding.detection_method in {"ML_CLASSIFICATION", "SUPERVISED_ML", "ANOMALY_DETECTION"} or finding.rule_id == 'RULE-ML-001' for finding in linked_findings):
            exec_rec.ml_status = "DETECTED"
        incident_link = db.query(IncidentEvent).filter(IncidentEvent.event_id.in_(event_ids)).order_by(IncidentEvent.id.desc()).first() if event_ids else None
        exec_rec.associated_incident_id = incident_link.incident_id if incident_link else None
        exec_rec.soc_alert_status = ("INCIDENT_CREATED" if incident_link else
            "FINDINGS_RECORDED" if linked_findings else "NO_ALERT" if events and all(event.processing_status == 'PROCESSED' for event in events) else "PENDING")
        if incident_link:
            from app.models.response import ResponseAction
            action = db.query(ResponseAction).filter_by(incident_id=incident_link.incident_id).order_by(ResponseAction.id.desc()).first()
            if action:
                exec_rec.metrics = {**(exec_rec.metrics or {}), "response_action": {
                    "action_id": action.action_id, "action_type": action.action_type,
                    "target_value": action.target_value, "status": action.status,
                    "requires_approval": action.requires_approval, "reason": action.reason}}

    def _refresh_recent_pipeline(self, db: Session, execution: AttackSimulationExecution):
        from app.services.time_utils import ensure_utc
        if not execution.start_time:
            return
        end = ensure_utc(execution.end_time) if execution.end_time else datetime.now(timezone.utc)
        if (datetime.now(timezone.utc) - end).total_seconds() > 300:
            return
        # Refresh late-arriving telemetry/detections while the pipeline drains.
        self._correlate_soc_pipeline(db, execution, execution.start_time, end + timedelta(seconds=10))

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
        execution = db.query(AttackSimulationExecution).filter_by(execution_id=execution_id).first()
        if execution:
            self._refresh_recent_pipeline(db, execution)
            db.commit()
        return execution

    def list_executions(self, db: Session, limit: int = 50) -> List[AttackSimulationExecution]:
        executions = db.query(AttackSimulationExecution).order_by(AttackSimulationExecution.id.desc()).limit(limit).all()
        for execution in executions:
            self._refresh_recent_pipeline(db, execution)
        db.commit()
        return executions


simulation_service = SimulationService()
