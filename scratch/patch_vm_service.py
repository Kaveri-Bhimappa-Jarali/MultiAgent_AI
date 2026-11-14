path = 'backend/app/services/vm_service.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''    for item in raw_records:
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
        )'''

replacement = '''    for item in raw_records:
        # Normalize timestamp to UTC
        raw_ts = item.get("timestamp")
        norm_ts = ensure_utc(raw_ts) if raw_ts else now

        # Normalize host to actual machine identifier
        host_val = item.get("host") or item.get("hostname") or (node.vm_id if node else "VM-GUEST")

        sec_evt = SecurityEventCreate(
            event_id=item.get("event_id") or f"EVT-VM-{uuid.uuid4().hex[:8].upper()}",
            event_type=item.get("event_type", "authentication"),
            severity=item.get("severity", "INFO"),
            timestamp=norm_ts,
            source_type=source_type,
            source_identifier=f"{vm_id}:{item.get('collector_source', 'guest-agent')}",
            source_ip=item.get("source_ip"),
            destination_ip=item.get("destination_ip") or (node.ip_address if node else None),
            source_port=item.get("source_port"),
            destination_port=item.get("destination_port"),
            protocol=item.get("protocol", "TCP"),
            username=item.get("username"),
            host=host_val,
            process_name=item.get("process_name"),
            command_line=item.get("command_line"),
            file_path=item.get("file_path"),
            file_action=item.get("file_action"),
            is_simulated=False,  # Authentic VM Telemetry!
            raw_payload=item.get("raw_payload") or str(item)
        )'''

if target in content:
    content = content.replace(target, replacement, 1)
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print('Updated vm_service.py')
else:
    print('Target not found in vm_service.py')
