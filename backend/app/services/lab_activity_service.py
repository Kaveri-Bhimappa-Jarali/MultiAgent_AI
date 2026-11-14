"""Windowed activity from authentic telemetry for the two connected lab nodes."""
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.config import settings
from app.models.event import SecurityEvent
from app.services.time_utils import ensure_utc, utc_isoformat
from app.services.vm_service import get_lab_nodes_status


def get_lab_activity(db: Session, minutes: int = 60, now: datetime = None):
    now = ensure_utc(now or datetime.now(timezone.utc))
    start = now - timedelta(minutes=minutes)
    bucket_seconds = minutes * 60 / 12
    topology = {
        'vm-attacker-01': ('Attacker VM', settings.ATTACKER_VM_HOST, settings.ATTACKER_VM_PRIVATE_IP),
        'vm-endpoint-01': ('Victim VM · Nginx', settings.VICTIM_VM_HOST, settings.VICTIM_VM_PRIVATE_IP),
    }
    live_nodes = {node['vm_id']: node for node in get_lab_nodes_status(db)}
    nodes = []
    for vm_id, (label, public_ip, private_ip) in topology.items():
        node = live_nodes.get(vm_id, {})
        nodes.append({
            'vm_id': vm_id, 'label': label, 'public_ip': public_ip,
            'private_ip': private_ip, 'status': node.get('status', 'CONFIGURED'),
            'last_heartbeat_at': node.get('last_heartbeat_at'),
            'last_telemetry_at': node.get('last_telemetry_at'),
            'total_events': node.get('events_count', 0),
            'window_events': 0,
        })
    node_map = {node['vm_id']: node for node in nodes}
    buckets = [dict(timestamp=utc_isoformat(start + timedelta(seconds=i * bucket_seconds)),
                    attacker=0, victim=0) for i in range(12)]
    categories = {'HTTP / Nginx': 0, 'Authentication': 0, 'Network': 0, 'Other': 0}
    total = high_severity = 0
    query = db.query(SecurityEvent.ingested_at, SecurityEvent.source_identifier,
                     SecurityEvent.event_type, SecurityEvent.severity).filter(
        SecurityEvent.ingested_at >= start, SecurityEvent.ingested_at < now,
        SecurityEvent.is_simulated.is_(False),
        SecurityEvent.source_identifier.startswith('vm-', autoescape=True),
    )
    for received, identifier, event_type, severity in query.yield_per(1000):
        vm_id = (identifier or '').split(':', 1)[0]
        if vm_id not in node_map:
            continue
        node_map[vm_id]['window_events'] += 1
        total += 1
        high_severity += int(severity in {'HIGH', 'CRITICAL'})
        index = min(11, int((ensure_utc(received) - start).total_seconds() / bucket_seconds))
        buckets[index]['attacker' if vm_id == 'vm-attacker-01' else 'victim'] += 1
        category = ('HTTP / Nginx' if identifier.endswith(':nginx_access.log') else
                    'Authentication' if event_type == 'authentication' else
                    'Network' if event_type == 'network_connection' else 'Other')
        categories[category] += 1
    return {
        'updated_at': utc_isoformat(now), 'window_start': utc_isoformat(start),
        'window_minutes': minutes, 'bucket_minutes': minutes / 12,
        'nodes': nodes, 'buckets': buckets,
        'categories': [{'name': name, 'count': count} for name, count in categories.items()],
        'total_events': total, 'high_severity_events': high_severity,
        'http_events': categories['HTTP / Nginx'],
    }
