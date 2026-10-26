from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON
from datetime import datetime, timezone
from app.database import Base

class VMNode(Base):
    __tablename__ = "vm_nodes"

    id = Column(Integer, primary_key=True, index=True)
    vm_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False)  # ENDPOINT, SERVER, ATTACKER, GATEWAY
    ip_address = Column(String(45), index=True, nullable=False)
    mac_address = Column(String(30), nullable=True)
    os_info = Column(String(100), default="Linux (Debian/Ubuntu)", nullable=False)
    
    status = Column(String(30), default="CONFIGURED", nullable=False)  # CONFIGURED, CONNECTED, RECEIVING_TELEMETRY, STALE, DISCONNECTED, ISOLATED
    is_isolated = Column(Boolean, default=False, nullable=False)
    
    last_heartbeat_at = Column(DateTime, nullable=True)
    last_telemetry_at = Column(DateTime, nullable=True)
    events_count = Column(Integer, default=0, nullable=False)
    detections_count = Column(Integer, default=0, nullable=False)
    
    active_collectors = Column(JSON, default=list, nullable=False)  # ["auth_log", "sudo_tracker", "socket_monitor", "process_watcher"]
    api_key = Column(String(64), nullable=False)
    system_metrics = Column(JSON, default=dict, nullable=False)  # cpu_percent, memory_mb, active_sockets
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

class VMAction(Base):
    __tablename__ = "vm_actions"

    id = Column(Integer, primary_key=True, index=True)
    action_id = Column(String(64), unique=True, index=True, nullable=False)
    incident_id = Column(String(64), index=True, nullable=True)
    vm_id = Column(String(50), index=True, nullable=False)
    action_type = Column(String(50), nullable=False)  # IPTABLES_BLOCK_IP, DISABLE_USER, ISOLATE_HOST, KILL_PROCESS
    target_value = Column(String(100), nullable=False)
    command_to_run = Column(Text, nullable=False)
    
    status = Column(String(30), default="PENDING_VM_PULL", nullable=False)  # PENDING_VM_PULL, EXECUTED_ON_VM, FAILED_ON_VM, VERIFIED_CONTAINED
    vm_execution_result = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    executed_at = Column(DateTime, nullable=True)
    verified_at = Column(DateTime, nullable=True)
