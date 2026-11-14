#!/usr/bin/env bash
# Usage: scripts/start_vm_tunnel.sh [victim|attacker]
# Exposes the local SOC API on each VM's loopback interface only.
set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
ROLE="${1:-victim}"
case "$ROLE" in victim|attacker) ;; *) echo 'Expected victim or attacker' >&2; exit 2 ;; esac
PYTHON_BIN="${SOC_PYTHON_BIN:-/home/ishank/.venv/bin/python}"
mapfile -t CONFIG < <(PYTHONPATH=backend "$PYTHON_BIN" - "$ROLE" <<'PY'
import sys
from app.config import settings
prefix = sys.argv[1].upper() + '_VM_'
for field in ('HOST', 'USER', 'SSH_PORT'):
    print(getattr(settings, prefix + field))
print(settings.ATTACKER_VM_SSH_KEY_PATH)
PY
)
[[ ${#CONFIG[@]} -eq 4 ]] || { echo 'Cannot read SOC settings' >&2; exit 1; }
SSH_ARGS=(-o BatchMode=yes -o StrictHostKeyChecking=accept-new
  -o ConnectTimeout=10 -o ServerAliveInterval=15 -o ServerAliveCountMax=3
  -o ExitOnForwardFailure=yes -p "${CONFIG[2]}")
if [[ -n "${CONFIG[3]}" ]]; then SSH_ARGS+=(-i "${CONFIG[3]}"); fi
echo "SOC tunnel: ${CONFIG[1]}@${CONFIG[0]}:127.0.0.1:18000 -> local 127.0.0.1:8000"
exec ssh "${SSH_ARGS[@]}" -N -T -R 127.0.0.1:18000:127.0.0.1:8000 "${CONFIG[1]}@${CONFIG[0]}"
