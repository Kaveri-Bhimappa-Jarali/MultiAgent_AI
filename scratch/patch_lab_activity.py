path = 'backend/app/services/lab_activity_service.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''    for vm_id, (label, public_ip, private_ip) in topology.items():
        node = live_nodes.get(vm_id, {})
        nodes.append({
            'vm_id': vm_id, 'label': label, 'public_ip': public_ip,
            'private_ip': private_ip, 'status': node.get('status', 'CONFIGURED'),'''

replacement = '''    for vm_id, (label, public_ip, private_ip) in topology.items():
        node = live_nodes.get(vm_id, {})
        effective_ip = node.get('ip_address') or private_ip
        nodes.append({
            'vm_id': vm_id, 'label': label, 'public_ip': public_ip,
            'private_ip': effective_ip, 'status': node.get('status', 'CONFIGURED'),'''

if target in content:
    content = content.replace(target, replacement, 1)
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print('Updated lab_activity_service.py')
else:
    print('Target not found in lab_activity_service.py')
