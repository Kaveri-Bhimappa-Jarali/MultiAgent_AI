#!/usr/bin/env bash
# ============================================================
#  SOC ↔ Victim VM SSH Reverse Tunnel
#  Exposes your LOCAL backend (port 8000) to the victim VM
#  at 45.74.156.14 on its own localhost:8000
#
#  Usage:
#    chmod +x scripts/start_vm_tunnel.sh
#    ./scripts/start_vm_tunnel.sh
#
#  Requirements:
#    - Backend running locally: uvicorn app.main:app --port 8000
#    - SSH access to ubuntu@45.74.156.69
# ============================================================

REMOTE_HOST="ubuntu@45.74.156.69"
REMOTE_PORT=8000       # Port opened on the VM's localhost
LOCAL_PORT=8000        # Your local backend port
TUNNEL_LOG="/tmp/soc_tunnel.log"

echo "============================================================"
echo "  SOC Victim VM ↔ Local Backend Tunnel"
echo "  Victim VM:    ${REMOTE_HOST}"
echo "  Tunnel:       VM:localhost:${REMOTE_PORT} → local:${LOCAL_PORT}"
echo "============================================================"
echo ""
echo "  Pre-check: Is your backend running on localhost:${LOCAL_PORT}?"
if curl -sf "http://127.0.0.1:${LOCAL_PORT}/health" > /dev/null 2>&1; then
    echo "  ✅ Backend is ONLINE — starting tunnel..."
else
    echo "  ⚠️  Backend not detected on port ${LOCAL_PORT}."
    echo "  Start it first with:"
    echo "    python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload"
    echo ""
    echo "  Proceeding with tunnel anyway (agent will buffer events)..."
fi

echo ""
echo "  Starting reverse SSH tunnel — press Ctrl+C to stop."
echo "  Logs: ${TUNNEL_LOG}"
echo ""

# -R 8000:localhost:8000  → VM's localhost:8000 forwards to your machine's localhost:8000
# -N                      → No remote command (tunnel only)
# -o ServerAliveInterval  → Keep-alive pings every 30s
# -o ExitOnForwardFailure → Exit if the tunnel port can't bind

ssh \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=3 \
    -o ExitOnForwardFailure=yes \
    -o StrictHostKeyChecking=accept-new \
    -R "${REMOTE_PORT}:localhost:${LOCAL_PORT}" \
    -N \
    "${REMOTE_HOST}" \
    2>&1 | tee "${TUNNEL_LOG}"
