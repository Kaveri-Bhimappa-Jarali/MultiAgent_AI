import asyncio
import sys

print(f"Python version: {sys.version}", flush=True)

# Test WindowsSelectorEventLoopPolicy
asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def test():
    print("Inside coroutine", flush=True)
    await asyncio.sleep(0.1)
    print("Awake!", flush=True)

print("Before asyncio.run", flush=True)
asyncio.run(test())
print("After asyncio.run", flush=True)
