import os
import sys

print("[DEBUG] Started test_lifespan.py", flush=True)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

print("[DEBUG] Importing engine...", flush=True)
from app.database import engine, Base, SessionLocal
print("[DEBUG] Importing auth...", flush=True)
from app.services.auth_service import seed_default_users
print("[DEBUG] Importing detection...", flush=True)
from app.services.detection_service import seed_detection_rules
print("[DEBUG] Importing threat intel...", flush=True)
from app.services.threat_intel_service import seed_threat_intelligence
print("[DEBUG] Importing event_queue...", flush=True)
from app.services.event_queue import event_queue
print("[DEBUG] Importing collector_manager...", flush=True)
from app.services.collectors.collector_manager import collector_manager
print("[DEBUG] Importing vm_service...", flush=True)
from app.services.vm_service import seed_default_vm_nodes
print("[DEBUG] All imports completed!", flush=True)

async def main():
    print("1. Base.metadata.create_all", flush=True)
    Base.metadata.create_all(bind=engine)
    print("2. SessionLocal", flush=True)
    db = SessionLocal()
    print("3. seed_default_users", flush=True)
    seed_default_users(db)
    print("4. seed_detection_rules", flush=True)
    seed_detection_rules(db)
    print("5. seed_threat_intelligence", flush=True)
    seed_threat_intelligence(db)
    print("6. seed_default_vm_nodes", flush=True)
    seed_default_vm_nodes(db)
    print("7. recover_pending_events", flush=True)
    event_queue.recover_pending_events(db)
    db.close()
    print("8. start_worker", flush=True)
    event_queue.start_worker()
    print("9. start_all collectors", flush=True)
    await collector_manager.start_all()
    print("10. Stopping collectors...", flush=True)
    await collector_manager.stop_all()
    await event_queue.stop_worker()
    print("11. Complete!", flush=True)

if __name__ == "__main__":
    print("[DEBUG] Inside __main__", flush=True)
    import asyncio
    try:
        print("[DEBUG] Calling asyncio.run", flush=True)
        asyncio.run(main())
        print("[DEBUG] Finished asyncio.run", flush=True)
    except Exception as e:
        print(f"[DEBUG] Error: {e}", flush=True)
