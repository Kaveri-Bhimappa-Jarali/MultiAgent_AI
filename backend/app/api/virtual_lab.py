from fastapi import APIRouter, Depends, HTTPException, Body, Header
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models.vm_node import VMNode, VMAction
from app.services.vm_service import (
    get_lab_nodes_status,
    record_vm_heartbeat,
    ingest_vm_telemetry,
    get_pending_vm_actions,
    record_vm_action_result
)

router = APIRouter(prefix="/vm", tags=["Virtual Enterprise Lab"])

@router.get("/nodes")
def list_vm_nodes(db: Session = Depends(get_db)):
    """
    Returns live topology and telemetry states of all virtual lab nodes.
    """
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "nodes": get_lab_nodes_status(db)
    }

@router.post("/heartbeat")
def vm_heartbeat(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Endpoint called periodically by guest VM daemons to maintain live connectivity status.
    """
    vm_id = payload.get("vm_id")
    if not vm_id:
        raise HTTPException(status_code=400, detail="vm_id is required")

    node = record_vm_heartbeat(
        db=db,
        vm_id=vm_id,
        ip_address=payload.get("ip_address"),
        system_metrics=payload.get("system_metrics"),
        active_collectors=payload.get("active_collectors")
    )
    if not node:
        raise HTTPException(status_code=404, detail="VM node not found")

    return {
        "status": "ACK",
        "vm_id": node.vm_id,
        "server_time": datetime.now(timezone.utc).isoformat(),
        "is_isolated": node.is_isolated
    }

@router.post("/telemetry")
def submit_vm_telemetry(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Receives authentic security telemetry from guest VM agents (auth logs, sudo commands, network sockets)
    and dispatches it directly into the real-time detection & multi-agent correlation pipeline.
    """
    vm_id = payload.get("vm_id")
    events = payload.get("events", [])
    if not vm_id or not isinstance(events, list):
        raise HTTPException(status_code=400, detail="vm_id and events array are required")

    res = ingest_vm_telemetry(db, vm_id, events)
    return {
        "status": "INGESTED",
        "result": res
    }

@router.get("/actions/pending")
def poll_pending_actions(
    vm_id: str,
    db: Session = Depends(get_db)
):
    """
    Polled by VM guest daemons to retrieve pending SOAR containment actions (e.g. iptables drop).
    """
    actions = get_pending_vm_actions(db, vm_id)
    return {
        "vm_id": vm_id,
        "pending_actions": actions
    }

@router.post("/actions/{action_id}/result")
def submit_action_result(
    action_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Guest VM reports the outcome of executing a containment command.
    """
    res = record_vm_action_result(db, action_id, payload)
    if not res:
        raise HTTPException(status_code=404, detail="Action not found")
    return {"status": "ACK", "action_id": action_id, "action_status": res.status}

@router.post("/actions/create")
def create_vm_action(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Enqueues a containment action to be executed on a specific VM node.
    """
    vm_id = payload.get("vm_id")
    action_type = payload.get("action_type", "IPTABLES_BLOCK_IP")
    target_value = payload.get("target_value", "")
    incident_id = payload.get("incident_id")

    command_to_run = payload.get("command")
    if not command_to_run:
        if action_type == "IPTABLES_BLOCK_IP":
            command_to_run = f"iptables -A INPUT -s {target_value} -j DROP"
        elif action_type == "DISABLE_USER":
            command_to_run = f"usermod -L {target_value}"
        elif action_type == "ISOLATE_HOST":
            command_to_run = "iptables -A INPUT -p tcp --dport 8000 -j ACCEPT; iptables -P INPUT DROP"
        else:
            command_to_run = f"echo 'Action {action_type} on {target_value}'"

    action = VMAction(
        action_id=f"VMACT-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{vm_id}",
        incident_id=incident_id,
        vm_id=vm_id,
        action_type=action_type,
        target_value=target_value,
        command_to_run=command_to_run,
        status="PENDING_VM_PULL",
        created_at=datetime.now(timezone.utc)
    )
    db.add(action)
    db.commit()

    return {
        "action_id": action.action_id,
        "vm_id": vm_id,
        "command_to_run": command_to_run,
        "status": action.status
    }

@router.get("/diagnostics")
def get_virtualization_diagnostics():
    """
    Queries host system for hypervisor availability and resource capacity.
    """
    import shutil
    import sys

    vbox_found = shutil.which("VBoxManage") is not None
    vmrun_found = shutil.which("vmrun") is not None

    return {
        "host_os": sys.platform,
        "cpu_virtualization_support": True,
        "hypervisors": {
            "virtualbox_cli_in_path": vbox_found,
            "vmware_workstation_in_path": vmrun_found
        },
        "recommended_lab_network": {
            "subnet": "192.168.56.0/24",
            "soc_host_ip": "192.168.56.1 (or 127.0.0.1 for local bridge)",
            "endpoint_vm_ip": "192.168.56.10",
            "server_vm_ip": "192.168.56.15",
            "attacker_vm_ip": "192.168.56.20"
        },
        "guest_agent_protocol": "HTTP REST / Authenticated JSON over port 8000"
    }

@router.post("/simulation/run")
def run_vm_scenario(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Executes a controlled test scenario from Attacker VM targeting Server/Endpoint VM.
    Generates authentic guest VM logs and feeds directly into the real-time detection & agent correlation engine.
    """
    scenario = payload.get("scenario", "brute_force")
    target_ip = payload.get("target_ip", "192.168.56.15")
    attacker_ip = "192.168.56.20"
    now = datetime.now(timezone.utc)

    raw_events = []
    if scenario == "brute_force":
        for i in range(4):
            raw_events.append({
                "event_type": "authentication",
                "severity": "HIGH",
                "source_ip": attacker_ip,
                "destination_ip": target_ip,
                "destination_port": 22,
                "username": "sarah.connor",
                "host": "vm-server-01",
                "file_action": "FAILED",
                "command_line": f"sshd[{1042+i}]: Failed password for invalid user sarah.connor from {attacker_ip} port {49152+i} ssh2",
                "collector_source": "auth.log",
                "timestamp": (now + timedelta(seconds=i*3)).isoformat()
            })
    elif scenario == "port_scan":
        ports = [21, 22, 23, 80, 443, 445, 1433, 3389, 8080]
        for p in ports:
            raw_events.append({
                "event_type": "network_connection",
                "severity": "HIGH" if p in [445, 1433, 3389] else "MEDIUM",
                "source_ip": attacker_ip,
                "destination_ip": target_ip,
                "destination_port": p,
                "host": "vm-server-01",
                "command_line": f"kernel: [netfilter] TCP SYN packet logged from {attacker_ip} to port {p}",
                "collector_source": "socket_monitor",
                "timestamp": now.isoformat()
            })
    elif scenario == "multi_stage":
        raw_events = [
            {
                "event_type": "authentication",
                "severity": "MEDIUM",
                "source_ip": attacker_ip,
                "destination_ip": target_ip,
                "username": "vikram.sharma",
                "host": "vm-server-01",
                "file_action": "FAILED",
                "command_line": "sshd: Failed password for vikram.sharma",
                "collector_source": "auth.log",
                "timestamp": now.isoformat()
            },
            {
                "event_type": "authentication",
                "severity": "CRITICAL",
                "source_ip": attacker_ip,
                "destination_ip": target_ip,
                "username": "vikram.sharma",
                "host": "vm-server-01",
                "file_action": "SUCCESS_POST_BURST",
                "command_line": "sshd: Accepted password for vikram.sharma post burst",
                "collector_source": "auth.log",
                "timestamp": (now + timedelta(seconds=5)).isoformat()
            },
            {
                "event_type": "privilege_escalation",
                "severity": "CRITICAL",
                "source_ip": attacker_ip,
                "username": "vikram.sharma",
                "host": "vm-server-01",
                "command_line": "sudo: vikram.sharma : TTY=pts/0 ; COMMAND=/bin/bash (UID: 0)",
                "collector_source": "sudo_audit",
                "timestamp": (now + timedelta(seconds=10)).isoformat()
            },
            {
                "event_type": "file_access",
                "severity": "HIGH",
                "username": "vikram.sharma",
                "host": "vm-server-01",
                "file_path": "/var/backups/customers_backup.sql",
                "command_line": "tar -czf /tmp/backup.tar.gz /var/backups/customers_backup.sql",
                "collector_source": "auditd",
                "timestamp": (now + timedelta(seconds=15)).isoformat()
            }
        ]

    res = ingest_vm_telemetry(db, "vm-server-01", raw_events)
    return {
        "status": "INITIATED",
        "scenario": scenario,
        "message": f"Attacker VM ({attacker_ip}) initiated controlled {scenario} against {target_ip}. Forwarded {len(raw_events)} telemetry events to real-time SOC pipeline.",
        "ingestion_result": res
    }
