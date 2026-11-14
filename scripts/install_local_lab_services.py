#!/usr/bin/env python3
"""Install user services for the local SOC and its two VM telemetry tunnels.

Run with the Python environment containing backend/requirements.txt.
"""
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def install():
    unit_dir = Path.home() / '.config/systemd/user'
    unit_dir.mkdir(parents=True, exist_ok=True)
    python = Path(sys.executable).absolute()
    node = shutil.which('node')
    if not node:
        raise SystemExit('Node.js is required for the local dashboard')
    units = {
        'soc-lab-backend': f'''[Unit]
Description=Multi-Agent SOC local backend
[Service]
WorkingDirectory={ROOT}
ExecStart={python} -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
Restart=on-failure
RestartSec=5
Environment=PYTHONUNBUFFERED=1
[Install]
WantedBy=default.target
''',
        'soc-lab-frontend': f'''[Unit]
Description=Sentinel SOC dashboard (soc-frontend)
After=soc-lab-backend.service
[Service]
WorkingDirectory={ROOT / 'soc-frontend'}
ExecStart={node} {ROOT / 'soc-frontend/node_modules/vite/bin/vite.js'} --host 127.0.0.1 --port 3000 --strictPort
Restart=on-failure
RestartSec=5
[Install]
WantedBy=default.target
''',
    }
    for role in ('victim', 'attacker'):
        units[f'soc-lab-tunnel-{role}'] = f'''[Unit]
Description=SOC telemetry SSH tunnel to {role} VM
Wants=soc-lab-backend.service
After=soc-lab-backend.service network-online.target
[Service]
WorkingDirectory={ROOT}
Environment=SOC_PYTHON_BIN={python}
ExecStart=/bin/bash {ROOT / 'scripts/start_vm_tunnel.sh'} {role}
Restart=always
RestartSec=5
[Install]
WantedBy=default.target
'''
    for name, content in units.items():
        (unit_dir / f'{name}.service').write_text(content)
    subprocess.run(['systemctl', '--user', 'daemon-reload'], check=True)
    names = [f'{name}.service' for name in units]
    subprocess.run(['systemctl', '--user', 'enable', '--now', *names], check=True)
    print('Installed:', ', '.join(names))


if __name__ == '__main__':
    install()
