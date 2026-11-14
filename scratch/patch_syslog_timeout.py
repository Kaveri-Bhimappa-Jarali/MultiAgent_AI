path = 'backend/app/services/collectors/syslog_collector.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''        for addr in bind_addrs:
            try:
                self.transport, _ = await loop.create_datagram_endpoint(
                    lambda: SyslogProtocol(self),
                    local_addr=addr
                )
                self.is_running = True
                bound = True
                print(f"[{self.collector_id}] Syslog UDP collector listening on {addr[0]}:{self.port}")
                break
            except Exception as e:
                last_err = e'''

replacement = '''        for addr in bind_addrs:
            try:
                self.transport, _ = await asyncio.wait_for(
                    loop.create_datagram_endpoint(
                        lambda: SyslogProtocol(self),
                        local_addr=addr
                    ),
                    timeout=2.0
                )
                self.is_running = True
                bound = True
                print(f"[{self.collector_id}] Syslog UDP collector listening on {addr[0]}:{self.port}")
                break
            except Exception as e:
                last_err = e'''

if target in content:
    content = content.replace(target, replacement, 1)
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print('Updated syslog_collector.py with timeout')
else:
    print('Target not found in syslog_collector.py')
