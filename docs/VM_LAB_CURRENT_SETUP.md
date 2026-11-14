# Connected cloud VM lab — 14 November 2026

The deployed topology is:

```text
soc-frontend dashboard 127.0.0.1:3000 -> local SOC API 127.0.0.1:8000
                                      ^
                         SSH reverse tunnels to both VMs
                                      |
Victim 45.74.156.43 / 10.0.0.11         |   Attacker 45.74.156.44 / 10.0.0.12
  soc-agent -> Nginx 127.0.0.1:8000 ----+     soc-agent -> 127.0.0.1:18000
  Nginx lab site 10.0.0.11:80 <-------------- HTTP over private subnet
```

The victim lab site accepts the attacker's private IP and the victim's own private IP. It listens on the private interface. The SOC proxy and reverse tunnel listeners bind to loopback. The attacker sends HTTP requests directly to `http://10.0.0.11/`; Nginx writes standard combined access logs for the guest collector.

Both VMs use Ubuntu 24.04 and SSH user `ubuntu`. The local backend dispatches through `/home/ishank/.ssh/id_ed25519`; no private SSH key was copied to either VM. `.env` and backend defaults now use the new public/private addresses. The simulation target allowlist is `10.0.0.11`.

## Services

The local services run under the current user's systemd manager and are enabled at user login. The local computer must remain running with an active user manager and network access for telemetry to reach the SOC.

```bash
systemctl --user status soc-lab-backend soc-lab-frontend soc-lab-tunnel-victim soc-lab-tunnel-attacker
systemctl --user restart soc-lab-backend soc-lab-frontend soc-lab-tunnel-victim soc-lab-tunnel-attacker
journalctl --user -u soc-lab-backend -n 50
```

Reinstall the local units, if needed, from the repository using the existing virtual environment:

```bash
/home/ishank/.venv/bin/python scripts/install_local_lab_services.py
```

The installer writes `~/.config/systemd/user/soc-lab-*.service`. The dashboard is available at http://127.0.0.1:3000 and the simulation page at http://127.0.0.1:3000/simulation.

On either VM:

```bash
sudo systemctl status soc-agent
sudo systemctl restart soc-agent
sudo journalctl -u soc-agent -n 30
```

On the victim:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Nginx and both guest services are enabled across VM restarts. Both SSH tunnels automatically reconnect after connection failure. Guest agents buffer auth events while the SOC is unreachable.

## Deployed files

- Guest script on each VM: `/opt/soc-agent/vm_telemetry_collector.py`.
- Guest unit on each VM: `/etc/systemd/system/soc-agent.service`, from the role-specific template in `deploy/vm-lab/`.
- Guest API key on each VM: `/etc/soc-agent.env`, root-owned, mode 0600. Each key is unique and matches its node record in the local database.
- Victim Nginx site: `/etc/nginx/sites-available/soc-lab`, enabled in `sites-enabled`; configuration source is `deploy/vm-lab/victim-nginx.conf`.
- Victim web root: `/var/www/soc-lab`.
- Victim collector identity: `vm-endpoint-01`; attacker identity: `vm-attacker-01`.

The victim collector runs with root privileges to support the existing analyst-approved response mechanism. The attacker collector runs as `ubuntu` with log-reading access through group `adm`. No containment actions were dispatched during connection setup; none were pending when the new collectors were enabled.

The existing `vm-server-01` entry remains a configured placeholder. This deployment contains the two supplied VMs.

## Verification

Verified on 14 November 2026:

- Private connectivity from `10.0.0.12` to `10.0.0.11`.
- HTTP 200 for a harmless GET from attacker to victim Nginx.
- Matching `nginx_access.log` event received by the SOC with source `10.0.0.12`, destination `10.0.0.11`, and `is_simulated=False`.
- Both VM collectors send acknowledged heartbeats and authentic telemetry.
- `/api/simulation/status` through the dashboard reports both VMs reachable, all four required tools installed, and `all_ready: true`.
- Nginx syntax validation; four virtual-lab backend tests; frontend production build.

The existing simulation implementation has limits: SSH auth scenarios exchange banners rather than complete password authentication, and data movement posts to a static Nginx site that does not implement uploads. Connection setup does not change those scenario implementations.

## Command Centre graphs

The Command Centre shows a compact VM reporting status, an activity graph comparing attacker and victim event counts, and a category graph separating Nginx, authentication, network, and other events.

Use the time selector for 15 minutes, one hour, or 24 hours. The graphs refresh every ten seconds through `/api/dashboard/lab-activity`. Counts cover all authentic received events for these two node identities within the window, including buffered events received after reconnecting. Simulated events and the unused server placeholder are excluded. Empty windows display zeroes.


## Simulation fixes and network collection

The simulation console checks SSH infrastructure on entry and on request. Lightweight execution history refreshes separately every five seconds while the page is visible. Terminal updates scroll the terminal itself, preserve the reader's position when scrolled up, and keep at most 1,000 displayed lines. Completed runs release the launch controls and Clear Logs remains cleared across unchanged history refreshes. Command Centre event-triggered refreshes are coalesced to avoid overlapping request bursts.

The network scenario honors TCP/UDP selection and the destination port, limits attempts to 20–150 with a 50 ms interval, streams progress without output buffering, and fails if all TCP connections fail. UDP submission is reported separately from victim observation. Timeouts cover stdout reading and child-process waiting.

The victim guest collector observes inbound IPv4 TCP SYN and UDP metadata on `eth0` from the configured lab peer `10.0.0.12`. This captures brief connections and datagrams that periodic socket snapshots miss. It batches packet counts and bytes by destination port/protocol; packet payloads are not retained. Configuration is in the victim service template through `SOC_NETWORK_PEER_IP` and `SOC_NETWORK_INTERFACE`.

Verified live with 20 successful TCP connections to port 80 and 20 UDP datagrams to port 9999. Victim packet telemetry recorded all 20 UDP datagrams. Both runs completed with captured telemetry. Delayed findings and incident links are refreshed for recent executions and restricted to evidence belonging to that execution's matching events.

Validation: 50 backend tests passed with local reasoning and external LLM keys disabled for the test process; frontend production build passed. Browser regression checks confirmed one infrastructure check per visit, stable page position during log updates, preserved terminal scroll position, completed-run updates, and persistent Clear Logs behavior.


## Command Centre update stability

While scrolling through findings, new feed snapshots are queued behind an “Update feed” button. VM graphs and summary metrics continue to refresh. The visible cards remain in place until the reader applies the new snapshot or returns to the top. Failed or partial refreshes retain the last successful feed. Incoming events are batched, the graph panel is memoized, and recurring chart animation is disabled. Floating notices are excluded from dashboard layout spacing, preventing their appearance from shifting the page.

Browser regression checks confirmed zero scroll or card-position shift during a burst of 40 incoming events, successful manual application of queued findings, and preserved cards during a temporary API failure.


## Active dashboard

The installed `soc-lab-frontend` service now runs `soc-frontend/` on port 3000. It proxies REST and WebSocket requests to the local backend on port 8000. Restart it with `systemctl --user restart soc-lab-frontend`. Manual `npm run dev` in `soc-frontend/` uses port 5173.

The SOC dashboard shows the actual victim and attacker reporting status. Its Virtual Lab page reads the `/api/vm/nodes` response, and its Attack Simulation page uses the backend scenario IDs, parameter schema, allowlisted victim address, and captured-event counts. Live events consume the backend's `EVENT_INGESTED` messages.

`auth_failed_pass` (Controlled Failed-Authentication Burst) and `web_path_enum` (Web Application Path & Directory Enumeration) were removed from the scenario catalog and remote script generator.

## Dynamic correlation evidence

The SOC correlation page loads the incident list and the selected incident's detail response. It refreshes both every ten seconds without resetting an existing selection. The graph shows unique linked event records in timestamp order, their actual IPs, event types, commands and severity. Selecting a node reveals its recorded collector, receipt time and payload.

Metrics distinguish loaded incidents from the backend's global open-incident count. The selected confidence comes directly from the incident record; no measured correlation accuracy is claimed. The result panel shows actual linked-record counts, the separately recorded cluster count, observed time span, status, risk and stored correlation explanation. Empty evidence and failed requests do not trigger a sample attack chain. Late responses for a previous incident selection are discarded.
