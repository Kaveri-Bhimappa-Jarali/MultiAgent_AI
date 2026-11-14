import sys
import os

with open("scratch/debug_log.txt", "w") as f:
    f.write("Step 1: started\n")
    f.flush()

    sys.path.insert(0, os.path.abspath("backend"))
    f.write("Step 2: sys.path set\n")
    f.flush()

    from app.config import settings
    f.write(f"Step 3: config loaded, db url: {settings.DATABASE_URL}\n")
    f.flush()

    from app.database import engine, Base, SessionLocal
    f.write("Step 4: db module loaded\n")
    f.flush()

    from app.main import app, lifespan
    f.write("Step 5: app imported\n")
    f.flush()

print("Debug script completed!")
