import asyncio
from datetime import datetime, timezone
from typing import Optional
from app.services.collectors.base_collector import BaseCollector
from app.schemas.event import SecurityEventCreate
from app.database import SessionLocal
from app.services.ingestion_service import normalize_and_ingest_events

class SyslogProtocol(asyncio.DatagramProtocol):
    def __init__(self, collector):
        self.collector = collector

    def datagram_received(self, data, addr):
        try:
            msg = data.decode("utf-8", errors="replace")
            self.collector.handle_syslog_message(msg, addr)
        except Exception as e:
            self.collector.error_count += 1
            self.collector.error_message = str(e)

class SyslogCollector(BaseCollector):
    def __init__(self, collector_id: str = "collector-syslog-udp", port: int = 5514):
        super().__init__(
            collector_id=collector_id,
            name=f"Syslog Receiver (UDP:{port})",
            collector_type="SYSLOG"
        )
        self.port = port
        self.transport = None

    async def start(self):
        if self.is_running:
            return
        loop = asyncio.get_running_loop()
        try:
            self.transport, _ = await loop.create_datagram_endpoint(
                lambda: SyslogProtocol(self),
                local_addr=("127.0.0.1", self.port)
            )
            self.is_running = True
            print(f"[{self.collector_id}] Syslog UDP collector listening on 127.0.0.1:{self.port}")
        except Exception as e:
            self.error_count += 1
            self.error_message = f"Failed binding syslog port {self.port}: {e}"
            print(f"[{self.collector_id}] {self.error_message}")

    async def stop(self):
        self.is_running = False
        if self.transport:
            self.transport.close()
            self.transport = None

    def handle_syslog_message(self, msg: str, addr):
        self.total_received += 1
        self.last_event_at = datetime.now(timezone.utc)
        
        # Simple syslog parsing
        host = addr[0] if addr else "remote-syslog"
        severity = "INFO"
        event_type = "network_connection"
        
        low_msg = msg.lower()
        if "fail" in low_msg or "denied" in low_msg or "auth" in low_msg:
            event_type = "authentication"
            severity = "HIGH" if "fail" in low_msg else "LOW"
        elif "port" in low_msg or "conn" in low_msg:
            event_type = "network_connection"
        elif "process" in low_msg or "exec" in low_msg:
            event_type = "process_execution"

        sec_event = SecurityEventCreate(
            event_type=event_type,
            severity=severity,
            source_ip=addr[0] if addr else None,
            host=host,
            command_line=msg.strip(),
            source_type="SYSLOG",
            source_identifier=f"udp:{self.port}",
            raw_payload=msg
        )

        db = SessionLocal()
        try:
            res, saved = normalize_and_ingest_events(db, [sec_event], auto_queue=True)
            self.total_processed += len(saved)
        finally:
            db.close()
