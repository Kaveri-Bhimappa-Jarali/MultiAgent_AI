import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath("backend"))

from app.main import app, lifespan

async def main():
    print("Entering lifespan...", flush=True)
    async with lifespan(app):
        print("Inside lifespan context!", flush=True)
        await asyncio.sleep(1)
        print("Exiting lifespan...", flush=True)
    print("Lifespan exited successfully!", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
