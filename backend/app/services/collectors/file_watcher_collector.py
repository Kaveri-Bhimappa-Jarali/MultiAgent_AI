import os
import asyncio
import re
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from app.services.collectors.base_collector import BaseCollector
from app.schemas.event import SecurityEventCreate
from app.database import SessionLocal
from app.services.ingestion_service import normalize_and_ingest_events

class FileWatcherCollector(BaseCollector):
    def __init__(self, collector_id: str = "collector-file-tail-auth", target_file: Optional[str] = None):
        super().__init__(
            collector_id=collector_id,
            name="Linux & System Log Tail Collector",
            collector_type="FILE_WATCHER"
        )
        if target_file is None:
            log_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data", "logs")
            os.makedirs(log_dir, exist_ok=True)
            self.target_file = os.path.join(log_dir, "auth.log")
        else:
            self.target_file = target_file

        self.byte_offset = 0
        self._watcher_task: Optional[asyncio.Task] = None

    async def start(self):
        if self.is_running:
            return
        self.is_running = True
        
        # Ensure log file exists
        if not os.path.exists(self.target_file):
            with open(self.target_file, "a") as f:
                f.write(f"# Telemetry auth.log initialized at {datetime.now(timezone.utc).isoformat()}\n")

        # Load checkpointed offset
        ckpt = self.load_checkpoint()
        self.byte_offset = ckpt.get("byte_offset", 0)
        self._watcher_task = asyncio.create_task(self._watch_loop())
        print(f"[{self.collector_id}] File watcher started for {self.target_file} from offset {self.byte_offset}")

    async def stop(self):
        self.is_running = False
        if self._watcher_task:
            self._watcher_task.cancel()
            try:
                await self._watcher_task
            except asyncio.CancelledError:
                pass
        self.save_checkpoint({"byte_offset": self.byte_offset})

    async def _watch_loop(self):
        while self.is_running:
            try:
                await self._check_for_new_lines()
                await asyncio.sleep(1.0)
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.error_count += 1
                self.error_message = str(e)
                await asyncio.sleep(2.0)

    async def _check_for_new_lines(self):
        if not os.path.exists(self.target_file):
            return

        current_size = os.path.getsize(self.target_file)
        
        # Check for file rotation (if file was truncated)
        if current_size < self.byte_offset:
            print(f"[{self.collector_id}] File rotation detected. Resetting byte offset.")
            self.byte_offset = 0

        if current_size > self.byte_offset:
            lines_to_process = []
            with open(self.target_file, "r", encoding="utf-8", errors="replace") as f:
                f.seek(self.byte_offset)
                new_data = f.read()
                self.byte_offset = f.tell()
                lines_to_process = new_data.splitlines()

            # Save checkpoint
            self.save_checkpoint({"byte_offset": self.byte_offset})

            # Process newly read lines
            parsed_events = []
            for line in lines_to_process:
                evt = self._parse_log_line(line)
                if evt:
                    parsed_events.append(evt)

            if parsed_events:
                self.total_received += len(parsed_events)
                self.last_event_at = datetime.now(timezone.utc)
                
                db = SessionLocal()
                try:
                    res, saved = normalize_and_ingest_events(db, parsed_events, auto_queue=True)
                    self.total_processed += len(saved)
                finally:
                    db.close()

    def _parse_log_line(self, line: str) -> Optional[SecurityEventCreate]:
        line = line.strip()
        if not line or line.startswith("#"):
            return None

        # Check for Failed SSH login pattern:
        # e.g.: Oct 12 14:00:00 srv sshd[1234]: Failed password for invalid user admin from 198.51.100.23 port 49152 ssh2
        if "failed password" in line.lower():
            ip_match = re.search(r"from\s+(\d+\.\d+\.\d+\.\d+)", line)
            user_match = re.search(r"for\s+(?:invalid\s+user\s+)?(\w+)", line)
            port_match = re.search(r"port\s+(\d+)", line)
            
            src_ip = ip_match.group(1) if ip_match else "unknown"
            user = user_match.group(1) if user_match else "unknown"
            port = int(port_match.group(1)) if port_match else 22

            return SecurityEventCreate(
                event_type="authentication",
                severity="HIGH",
                source_ip=src_ip,
                source_port=port,
                destination_port=22,
                username=user,
                host="SRV-LINUX-AUTH",
                file_action="FAILED",
                command_line=line,
                source_type="LOG_FILE_WATCHER",
                source_identifier=os.path.basename(self.target_file),
                raw_payload=line
            )

        # Check for Accepted password
        elif "accepted password" in line.lower() or "session opened" in line.lower():
            ip_match = re.search(r"from\s+(\d+\.\d+\.\d+\.\d+)", line)
            user_match = re.search(r"for\s+(\w+)", line)
            src_ip = ip_match.group(1) if ip_match else None
            user = user_match.group(1) if user_match else "unknown"

            return SecurityEventCreate(
                event_type="authentication",
                severity="INFO",
                source_ip=src_ip,
                destination_port=22,
                username=user,
                host="SRV-LINUX-AUTH",
                file_action="SUCCESS",
                command_line=line,
                source_type="LOG_FILE_WATCHER",
                source_identifier=os.path.basename(self.target_file),
                raw_payload=line
            )

        # Check for Sudo commands
        elif "sudo:" in line.lower():
            user_match = re.search(r"sudo:\s+(\w+)\s*:", line)
            cmd_match = re.search(r"COMMAND=(.*)$", line)
            user = user_match.group(1) if user_match else "unknown"
            cmd = cmd_match.group(1) if cmd_match else line

            is_root = "root" in line.lower() or "bash" in cmd.lower()
            return SecurityEventCreate(
                event_type="privilege_escalation" if is_root else "process_execution",
                severity="HIGH" if is_root else "LOW",
                username=user,
                host="SRV-LINUX-AUTH",
                command_line=cmd,
                source_type="LOG_FILE_WATCHER",
                source_identifier=os.path.basename(self.target_file),
                raw_payload=line
            )

        return None
