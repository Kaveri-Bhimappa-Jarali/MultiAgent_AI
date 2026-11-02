# Running the Multi-Agent AI SOC Platform

**Authors:** Deepak, Isha U Prabhu, Ishank Kumar, Kaveri Jarali  
**Repository:** https://github.com/Kaveri-Bhimappa-Jarali/MultiAgent_AI  
**Last Updated:** 2026-11-02

---

## Current Repository State (After Merge)

The `main` branch now contains the **merged result of all team branches**:

| Commit | Author | What Was Added |
|:---|:---|:---|
| `3d43aaa` (HEAD) | Merge commit | Merged `deepak` branch into `main` |
| `ea5b72f` | Ishank | Attacker VM + Attack Simulation feature (23 files) |
| `21c8800` | Deepak | `soc-frontend/` — Sentinel SOC React dashboard (separate app) |
| `d032f0d` | Ishank | Earlier attacker VM and backend integration work |
| `93e28df` | Origin/main | Dashboard update baseline |

> **Two separate frontends exist in this repo:**
> - **`frontend/`** — The main production TypeScript React dashboard (use this one)
> - **`soc-frontend/`** — Deepak's alternative Sentinel SOC dashboard (standalone JSX app)

---

## Quick Start (Linux / macOS)

### Terminal 1 — Backend (FastAPI + uvicorn)

```bash
cd /home/ishank/ishank_github/MultiAgent_AI

# Activate the virtual environment
source /home/ishank/.venv/bin/activate

# Start the FastAPI backend
python -m uvicorn app.main:app \
  --app-dir backend \
  --host 127.0.0.1 \
  --port 8000 \
  --reload
```

**Backend is ready when you see:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     [EventQueue] Real-time detection & agent worker loop started.
```

| Endpoint | URL |
|:---|:---|
| API Base | http://127.0.0.1:8000 |
| Swagger Docs | http://127.0.0.1:8000/docs |
| Health Check | http://127.0.0.1:8000/health |

---

### Terminal 2 — Main Frontend (TypeScript React / Vite)

```bash
cd /home/ishank/ishank_github/MultiAgent_AI/frontend

npm install     # only needed once / after package changes
npm run dev
```

**Dashboard live at:** http://localhost:3000 (or http://localhost:5173)

**Login credentials:**

| Role | Username | Password |
|:---|:---|:---|
| SOC Admin (Lead Director) | `admin` | `Admin@SOC2026!` |
| SOC Analyst (Triage) | `analyst` | `Analyst@SOC2026!` |

---

### Terminal 3 — (Optional) Deepak's Sentinel SOC Frontend

```bash
cd /home/ishank/ishank_github/MultiAgent_AI/soc-frontend

npm install
npm run dev   # runs on a different port, e.g. 5174
```

Connects to the same backend at `http://127.0.0.1:8000`.

---

## Environment Configuration (`.env`)

The `.env` file is at the project root, gitignored, already configured. Check it:

```bash
cat /home/ishank/ishank_github/MultiAgent_AI/.env
```

Key variables:

```env
# LLM (leave blank to use local rule-based mode)
LLM_PROVIDER=local
GEMINI_API_KEY=    # Put Gemini key HERE, NOT in config.py

# Attacker VM
ATTACKER_VM_HOST=45.74.156.31
ATTACKER_VM_PRIVATE_IP=10.0.0.13
ATTACKER_VM_USER=ubuntu
ATTACKER_VM_SSH_PORT=22
ATTACKER_VM_SSH_KEY_PATH=/home/ishank/.ssh/id_ed25519

# Victim VM
VICTIM_VM_HOST=45.74.156.69
VICTIM_VM_PRIVATE_IP=10.0.0.14
VICTIM_VM_USER=ubuntu
VICTIM_VM_SSH_PORT=22
VICTIM_VM_INTERFACE=eth0

# Simulation safety allowlist
ATTACK_SIMULATION_ENABLED=true
ATTACK_SIMULATION_MAX_CONCURRENT=1
ATTACK_SIMULATION_TIMEOUT=300
ATTACK_SIMULATION_ALLOWED_TARGETS=10.0.0.14
```

> WARNING: Gemini API key is currently hardcoded in `backend/app/config.py` line 27.
> Move it to `.env` as `GEMINI_API_KEY=<your-key>` and reset default in config.py to `""`.

---

## Attack Simulation Feature (All Files Confirmed Present After Merge)

### Architecture

```
Attacker VM (45.74.156.31)
     |  SSH via backend subprocess
     v
SOC Backend (localhost:8000)
     |-- POST /api/simulation/launch
     |-- GET  /api/simulation/status
     |-- GET  /api/simulation/scenarios
     v
Victim VM (45.74.156.69 -> 10.0.0.14)
     |  Guest agent sends telemetry back
     v
SOC Detection Pipeline -> ML Findings -> Incidents -> SOAR
```

### File Map

| File | Purpose |
|:---|:---|
| `backend/app/api/simulation.py` | REST API router: launch, stop, status, executions |
| `backend/app/services/simulation_service.py` | SSH dispatch, scenario catalog, polling, event linkage |
| `backend/app/models/simulation.py` | SQLAlchemy SimulationExecution model |
| `backend/app/schemas/simulation.py` | Pydantic request/response schemas |
| `frontend/src/pages/AttackSimulation.tsx` | React UI: VM topology, live terminal, scenario cards, history |
| `scripts/simulate_attacks.py` | CLI to inject attack events via REST (no real VM needed) |
| `scripts/start_vm_tunnel.sh` | SSH reverse tunnel so victim VM can reach your local backend |
| `virtual-lab/guest-agent/vm_telemetry_collector.py` | Daemon on victim VM; collects auth.log and sends telemetry |

### Routes Confirmed

In `backend/app/main.py`:
```python
from app.api.simulation import router as simulation_router
app.include_router(simulation_router, prefix=settings.API_V1_STR)
# Mounts at /api/simulation/*
```

In `frontend/src/App.tsx`:
```tsx
<Route path="simulation" element={<AttackSimulation />} />
```

In `frontend/src/components/layout/Sidebar.tsx`:
```tsx
{ to: '/simulation', label: 'Attack Simulation', icon: Crosshair }
```

---

## Running Simulated Attacks (No Real VM Required)

```bash
# Backend must be running first on localhost:8000

python3 scripts/simulate_attacks.py --scenario brute_force
python3 scripts/simulate_attacks.py --scenario portscan
python3 scripts/simulate_attacks.py --scenario exfiltration
python3 scripts/simulate_attacks.py --scenario ransomware
python3 scripts/simulate_attacks.py --scenario ddos

# Run all 5 in sequence:
python3 scripts/simulate_attacks.py

# Adjust speed (default 0.2s delay between events):
python3 scripts/simulate_attacks.py --scenario brute_force --delay 0.5
```

After injecting, watch in the dashboard:
- **Events** — new events in real time
- **Detections** — rule and ML findings triggering
- **Incidents** — incidents auto-created by the Correlation Agent
- **/simulation** — execution history and 5-stage pipeline status

---

## Live VM Tunnel

```bash
chmod +x scripts/start_vm_tunnel.sh
./scripts/start_vm_tunnel.sh   # keep this terminal open
```

Creates: `VM localhost:8000 <--- forwards to --- your localhost:8000`

Then on the victim VM (45.74.156.69):
```bash
python3 vm_telemetry_collector.py \
  --soc-host http://localhost:8000 \
  --vm-id vm-endpoint-01 \
  --api-key VM-KEY-ENDPOINT-SEC-2026
```

---

## Running All Tests

```bash
cd /home/ishank/ishank_github/MultiAgent_AI
source /home/ishank/.venv/bin/activate

# 44 backend tests (100% expected pass)
PYTHONPATH=backend python -m pytest backend/tests/ -v

# Phase 10 acceptance verification
PYTHONPATH=backend python scripts/phase10_acceptance_verification.py

# Frontend TypeScript build
cd frontend && npm run build && cd ..
```

---

## File Integrity Verification Script

Run after any `git merge` or `git pull`:

```bash
cd /home/ishank/ishank_github/MultiAgent_AI

echo "=== Backend Core ==="
for f in backend/app/main.py backend/app/config.py backend/requirements.txt; do
  [ -f "$f" ] && echo "  OK  $f" || echo "  MISSING: $f"
done

echo "=== Attack Simulation Feature ==="
for f in \
  backend/app/api/simulation.py \
  backend/app/services/simulation_service.py \
  backend/app/models/simulation.py \
  backend/app/schemas/simulation.py \
  frontend/src/pages/AttackSimulation.tsx \
  scripts/simulate_attacks.py \
  scripts/start_vm_tunnel.sh \
  virtual-lab/guest-agent/vm_telemetry_collector.py; do
  [ -f "$f" ] && echo "  OK  $f" || echo "  MISSING: $f"
done

echo "=== Main Frontend ==="
for f in \
  frontend/src/App.tsx \
  frontend/src/components/layout/Sidebar.tsx \
  frontend/src/api/client.ts \
  frontend/src/types/index.ts; do
  [ -f "$f" ] && echo "  OK  $f" || echo "  MISSING: $f"
done

echo "=== Deepak's Sentinel Frontend ==="
[ -d "soc-frontend/src" ] && echo "  OK  soc-frontend/" || echo "  MISSING"
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|:---|:---|:---|
| `No module named 'pydantic_settings'` | Not installed in venv | `pip install pydantic-settings` in your venv |
| `No module named 'app'` in pytest | Missing PYTHONPATH | `PYTHONPATH=backend pytest backend/tests/` |
| `/simulation` page is blank | Check import in App.tsx | Already present: line 24 + line 78 of App.tsx |
| Attack Simulation shows VMs UNREACHABLE | VMs offline / no SSH key | Use `simulate_attacks.py` for local testing |
| Port 8000 already in use | Old uvicorn still running | `pkill -f uvicorn` then restart |
| CORS error in browser | Frontend port not whitelisted | Add port to `CORS_ORIGINS` in `config.py` |
| DB column error on startup | Old SQLite schema | Auto-fixed by `ensure_event_processed_at_column()` |

---

## Push to GitHub

```bash
git push origin main
```

Current branch graph:
```
* 3d43aaa (HEAD -> main)  Merge branch 'deepak'
|\ 
| * 21c8800 (deepak)      Sentinel SOC dashboard in soc-frontend/
* | ea5b72f               final (attack sim + VM integration)
|/|
| * 93e28df (origin/main) Dashboard update
* | d032f0d               attacker vm and integration
```
