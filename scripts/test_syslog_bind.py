import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from app.services.collectors.syslog_collector import SyslogCollector

async def main():
    print("Testing SyslogCollector start()...", flush=True)
    sc = SyslogCollector(port=5514)
    await sc.start()
    print(f"SyslogCollector is_running: {sc.is_running}, error: {sc.error_message}", flush=True)
    await sc.stop()
    print("SyslogCollector stopped successfully.", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
