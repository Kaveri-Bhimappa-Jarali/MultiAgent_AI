import os
import sys

print("[START] test_sync_startup.py", flush=True)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database import engine, Base, SessionLocal
from app.services.auth_service import seed_default_users
from app.services.detection_service import seed_detection_rules
from app.services.threat_intel_service import seed_threat_intelligence
from app.services.vm_service import seed_default_vm_nodes
from app.services.event_queue import event_queue

print("1. Creating tables...", flush=True)
Base.metadata.create_all(bind=engine)
print("2. Opening SessionLocal...", flush=True)
db = SessionLocal()
print("3. Seeding users...", flush=True)
seed_default_users(db)
print("4. Seeding rules...", flush=True)
seed_detection_rules(db)
print("5. Seeding intel...", flush=True)
seed_threat_intelligence(db)
print("6. Seeding vm nodes...", flush=True)
seed_default_vm_nodes(db)
print("7. Recovering pending events...", flush=True)
event_queue.recover_pending_events(db)
db.close()
print("8. Synchronous startup steps PASSED!", flush=True)
