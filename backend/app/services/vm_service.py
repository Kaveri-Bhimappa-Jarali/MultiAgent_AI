import uuid
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.vm_node import VMNode, VMAction
from app.models.event import SecurityEvent
from app.schemas.event import SecurityEventCreate
from app.services.ingestion_service import normalize_and_ingest_events
from app.services.broadcaster import broadcaster

DEFAULT_LAB_NODES = [
    {
        "vm_id": "vm-endpoint-01",
        "name": "Endpoint Workstation (Ubuntu/Debian)",
        "role": "ENDPOINT",
        "ip_address": "192.168.56.10",
        "os_info": "Linux (Debian/Ubuntu 64-bit)",
        "active_collectors": ["auth_log", "sudo_tracker", "socket_monitor", "process_watcher"],
        "api_key": "VM-KEY-ENDPOINT-SEC-2026"
    },
    {
        "vm_id": "vm-server-01",
        "name": "Internal Enterprise Server (Debian/Ubuntu)",
        "role": "SERVER",
        "ip_address": "192.168.56.15",
        "os_info": "Linux (Debian Server 64-bit)",
        "active_collectors": ["auth_log", "ssh_monitor", "service_ports", "auditd"],
        "api_key": "VM-KEY-SERVER-PROD-2026"
    },
    {
        "vm_id": "vm-attacker-01",
        "name": "Attacker / Test Node (Kali/Alpine)",
        "role": "ATTACKER",
        "ip_address": "192.168.56.20",
        "os_info": "Linux (Kali/Alpine Testbed)",
        "active_collectors": ["attack_toolkit", "probe_generator"],
        "api_key": "VM-KEY-ATTACKER-TEST-2026"
    }
]

def seed_default_vm_nodes(db: Session):
    for node_info in DEFAULT_LAB_NODES:
        existing = db.query(VMNode).filter(VMNode.vm_id == node_info["vm_id"]).first()
        if not existing:
            node = VMNode(
                vm_id=node_info["vm_id"],
                name=node_info["name"],
                role=node_info["role"],
                ip_address=node_info["ip_address"],
                os_info=node_info["os_info"],
                status="CONFIGURED",
                active_collectors=node_info["active_collectors"],
                api_key=node_info["api_key"],
                system_metrics={"cpu_percent": 2.5, "memory_mb": 512, "disk_gb_free": 20.0},
                created_at=datetime.now(timezone.utc)
            )
            db.add(node)
    db.commit()

def record_vm_heartbeat(
    db: Session,
    vm_id: str,
    ip_address: Optional[str] = None,
    system_metrics: Optional[Dict[str, Any]] = None,
    active_collectors: Optional[List[str]] = None
) -> Optional[VMNode]:
    node = db.query(VMNode).filter(VMNode.vm_id == vm_id).first()
    if not node:
        return None

    now = datetime.now(timezone.utc)
    node.last_heartbeat_at = now
    if node.status in ["CONFIGURED", "DISCONNECTED", "STALE"]:
        node.status = "CONNECTED"

    if ip_address:
        node.ip_address = ip_address
    if system_metrics:
        node.system_metrics = system_metrics
    if active_collectors:
        node.active_collectors = active_collectors

    db.commit()
    broadcaster.publish_sync("VM_STATUS_CHANGED", {
        "vm_id": node.vm_id,
        "name": node.name,
        "role": node.role,
        "status": node.status,
        "ip_address": node.ip_address,
        "last_heartbeat_at": now.isoformat()
    })
    return node

def ingest_vm_telemetry(
    db: Session,
    vm_id: str,
    raw_records: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Ingests authentic security telemetry arriving directly from a VM guest daemon.
    Converts to SecurityEventCreate with is_simulated=False, source_type=VM_ENDPOINT/SERVER,
    and forwards to the real-time detection & agent correlation engine.
    """
    node = db.query(VMNode).filter(VMNode.vm_id == vm_id).first()
    now = datetime.now(timezone.utc)

    if node:
        node.last_telemetry_at = now
        node.status = "RECEIVING_TELEMETRY"
        db.commit()

    source_type = f"VM_{node.role}" if node else "VM_GUEST"
    events_to_ingest: List[SecurityEventCreate] = []

    for item in raw_records:
        sec_evt = SecurityEventCreate(
            event_id=item.get("event_id") or f"EVT-VM-{uuid.uuid4().hex[:8].upper()}",
            event_type=item.get("event_type", "authentication"),
            severity=item.get("severity", "INFO"),
            timestamp=item.get("timestamp") or now,
            source_type=source_type,
            source_identifier=f"{vm_id}:{item.get('collector_source', 'guest-agent')}",
            source_ip=item.get("source_ip"),
            destination_ip=item.get("destination_ip") or (node.ip_address if node else None),
            source_port=item.get("source_port"),
            destination_port=item.get("destination_port"),
            protocol=item.get("protocol", "TCP"),
            username=item.get("username"),
            host=item.get("host") or (node.name if node else "VM-GUEST"),
            process_name=item.get("process_name"),
            command_line=item.get("command_line"),
            file_path=item.get("file_path"),
            file_action=item.get("file_action"),
            is_simulated=False,  # Authentic VM Telemetry!
            raw_payload=item.get("raw_payload") or str(item)
        )
        events_to_ingest.append(sec_evt)

    res, saved = normalize_and_ingest_events(db, events_to_ingest, auto_queue=True)

    if node:
        node.events_count += len(saved)
        db.commit()

    return {
        "vm_id": vm_id,
        "accepted": res.accepted,
        "queued": res.queued_for_processing,
        "duplicates": res.duplicates_skipped
    }

def get_pending_vm_actions(db: Session, vm_id: str) -> List[Dict[str, Any]]:
    actions = db.query(VMAction).filter(
        VMAction.vm_id == vm_id,
        VMAction.status == "PENDING_VM_PULL"
    ).all()
    return [
        {
            "action_id": a.action_id,
            "action_type": a.action_type,
            "target_value": a.target_value,
            "command_to_run": a.command_to_run,
            "created_at": a.created_at.isoformat()
        }
        for a in actions
    ]

def record_vm_action_result(
    db: Session,
    action_id: str,
    execution_result: Dict[str, Any]
) -> Optional[VMAction]:
    action = db.query(VMAction).filter(VMAction.action_id == action_id).first()
    if not action:
        return None

    now = datetime.now(timezone.utc)
    success = execution_result.get("success", True)
    action.status = "EXECUTED_ON_VM" if success else "FAILED_ON_VM"
    action.executed_at = now
    action.vm_execution_result = execution_result
    db.commit()

    broadcaster.publish_sync("VM_ACTION_EXECUTED", {
        "action_id": action.action_id,
        "vm_id": action.vm_id,
        "status": action.status,
        "result": execution_result
    })
    return action

def get_lab_nodes_status(db: Session) -> List[Dict[str, Any]]:
    nodes = db.query(VMNode).all()
    now = datetime.now(timezone.utc)
    statuses = []

    for n in nodes:
        # Compute fresh status
        display_status = n.status
        if n.last_heartbeat_at:
            diff = (now - n.last_heartbeat_at).total_seconds()
            if diff > 60 and n.status != "ISOLATED":
                display_status = "STALE"
            elif diff > 300 and n.status != "ISOLATED":
                display_status = "DISCONNECTED"

        statuses.append({
            "id": n.id,
            "vm_id": n.vm_id,
            "name": n.name,
            "role": n.role,
            "ip_address": n.ip_address,
            "os_info": n.os_info,
            "status": display_status,
            "is_isolated": n.is_isolated,
            "events_count": n.events_count,
            "detections_count": n.detections_count,
            "active_collectors": n.active_collectors,
            "last_heartbeat_at": n.last_heartbeat_at.isoformat() if n.last_heartbeat_at else None,
            "last_telemetry_at": n.last_telemetry_at.isoformat() if n.last_telemetry_at else None,
            "system_metrics": n.system_metrics
        })
    return statuses
