#!/usr/bin/env python3
"""
scripts/capture_screenshots.py
Automated screenshot capture using Headless Chrome DevTools Protocol (CDP).
Captures pixel-perfect screenshots of the redesigned horizontal navbar and all key pages.
"""
import os
import sys
import time
import json
import base64
import urllib.request
import subprocess
import asyncio
import websockets

BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://127.0.0.1:3000"
CDP_PORT = 9222
SCREENSHOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "reports", "screenshots"))
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

os.makedirs(SCREENSHOT_DIR, exist_ok=True)

async def send_cdp(ws, method, params=None, msg_id=1):
    msg = {"id": msg_id, "method": method, "params": params or {}}
    await ws.send(json.dumps(msg))
    while True:
        resp = await ws.recv()
        data = json.loads(resp)
        if data.get("id") == msg_id:
            return data.get("result", {})

async def capture_page(ws, url, filename, wait_seconds=3, msg_id_start=10):
    print(f"[*] Navigating to {url} ...")
    await send_cdp(ws, "Page.navigate", {"url": url}, msg_id=msg_id_start)
    await asyncio.sleep(wait_seconds)
    
    # Capture screenshot
    res = await send_cdp(ws, "Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False}, msg_id=msg_id_start + 1)
    img_data = base64.b64decode(res["data"])
    filepath = os.path.join(SCREENSHOT_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(img_data)
    print(f"    -> Saved screenshot: {filename} ({len(img_data):,} bytes)")

def wait_for_server(url, max_retries=30):
    for i in range(max_retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "HealthCheck"})
            with urllib.request.urlopen(req, timeout=2) as resp:
                if resp.status in (200, 304, 404):
                    return True
        except Exception:
            time.sleep(1)
    return False

def get_auth_token():
    try:
        data = json.dumps({"username": "admin", "password": "Admin@SOC2026!"}).encode("utf-8")
        req = urllib.request.Request(f"{BACKEND_URL}/api/auth/login", data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            return res.get("access_token")
    except Exception as e:
        print(f"Error getting auth token: {e}")
        return None

async def main():
    print("=" * 70)
    print("ROYAL SOC REDESIGN: AUTOMATED SCREENSHOT SUITE")
    print("=" * 70)

    # 1. Start Backend Server
    print("[1] Starting backend API server on 127.0.0.1:8000 ...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    # 2. Start Frontend Preview/Dev Server
    print("[2] Starting frontend Vite server on 127.0.0.1:3000 ...")
    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
    frontend_proc = subprocess.Popen(
        ["cmd.exe", "/c", "npm run dev -- --host 127.0.0.1 --port 3000"],
        cwd=frontend_dir,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    try:
        print("[3] Waiting for servers to be reachable ...")
        if not wait_for_server(f"{BACKEND_URL}/api/dashboard/summary", max_retries=20):
            print("Failed to connect to backend server.")
            return 1
        print("    -> Backend ready.")

        if not wait_for_server(FRONTEND_URL, max_retries=20):
            print("Failed to connect to frontend server.")
            return 1
        print("    -> Frontend ready.")

        token = get_auth_token()
        print(f"    -> Obtained auth token: {token[:15]}..." if token else "    -> No token obtained")

        # 3. Launch Headless Chrome
        print(f"[4] Launching Headless Chrome on port {CDP_PORT} ...")
        chrome_proc = subprocess.Popen([
            CHROME_PATH,
            "--headless=new",
            f"--remote-debugging-port={CDP_PORT}",
            "--disable-gpu",
            "--no-sandbox",
            "--window-size=1680,1050"
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        time.sleep(2)

        # Get WebSocket debugger URL
        tabs_req = urllib.request.urlopen(f"http://127.0.0.1:{CDP_PORT}/json")
        tabs = json.loads(tabs_req.read().decode("utf-8"))
        ws_url = tabs[0]["webSocketDebuggerUrl"]
        print(f"    -> Connected to Chrome CDP: {ws_url}")

        async with websockets.connect(ws_url) as ws:
            # Enable Page and Runtime
            await send_cdp(ws, "Page.enable", msg_id=1)
            await send_cdp(ws, "Runtime.enable", msg_id=2)

            # Navigate to frontend login first
            await send_cdp(ws, "Page.navigate", {"url": f"{FRONTEND_URL}/login"}, msg_id=3)
            await asyncio.sleep(2)

            # Inject auth token into localStorage
            if token:
                expr = f"localStorage.setItem('soc_token', '{token}');"
                await send_cdp(ws, "Runtime.evaluate", {"expression": expr}, msg_id=4)
                print("    -> Injected auth token into browser localStorage.")

            # Capture Screenshots
            print("\n[5] Capturing Page Screenshots ...")
            
            # 1. Command Center / Dashboard
            await capture_page(ws, f"{FRONTEND_URL}/", "01_command_center.png", wait_seconds=3, msg_id_start=10)

            # 2. Security Events
            await capture_page(ws, f"{FRONTEND_URL}/events", "02_security_events.png", wait_seconds=2, msg_id_start=20)

            # 3. Threat Detections
            await capture_page(ws, f"{FRONTEND_URL}/detections", "03_threat_detections.png", wait_seconds=2, msg_id_start=30)

            # 4. Multi-Agent SOC
            await capture_page(ws, f"{FRONTEND_URL}/agents", "04_multi_agent_soc.png", wait_seconds=2, msg_id_start=40)

            # 5. Incidents & RCA
            await capture_page(ws, f"{FRONTEND_URL}/incidents", "05_incidents_rca.png", wait_seconds=2, msg_id_start=50)

            # 6. SOAR Responses
            await capture_page(ws, f"{FRONTEND_URL}/responses", "06_soar_responses.png", wait_seconds=2, msg_id_start=60)

            # 7. Virtual Enterprise Lab
            await capture_page(ws, f"{FRONTEND_URL}/virtual-lab", "07_virtual_enterprise_lab.png", wait_seconds=2, msg_id_start=70)

            # 8. Demo Attack Lab
            await capture_page(ws, f"{FRONTEND_URL}/demo", "08_demo_attack_lab.png", wait_seconds=2, msg_id_start=80)

            # 9. Evaluation Lab
            await capture_page(ws, f"{FRONTEND_URL}/evaluation", "09_evaluation_lab.png", wait_seconds=2, msg_id_start=90)

            print("\n[✓] All 9 high-resolution screenshots captured successfully!")

        chrome_proc.terminate()
    finally:
        print("[*] Tearing down background servers ...")
        try:
            backend_proc.terminate()
        except Exception:
            pass
        try:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(frontend_proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass

    return 0

if __name__ == "__main__":
    asyncio.run(main())
