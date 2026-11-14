path = 'backend/app/services/collectors/syslog_collector.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''        try:
            self.transport, _ = await loop.create_datagram_endpoint(
                lambda: SyslogProtocol(self),
                local_addr=("127.0.0.1", self.port)
            )
            self.is_running = True
            print(f"[{self.collector_id}] Syslog UDP collector listening on 127.0.0.1:{self.port}")
        except Exception as e:
            self.error_count += 1
            self.error_message = f"Failed binding syslog port {self.port}: {e}"
            print(f"[{self.collector_id}] {self.error_message}")'''

replacement = '''        # Bind to 0.0.0.0 so both local synthetic tests and external VMs (192.168.56.x) can deliver syslog
        bind_addrs = [("0.0.0.0", self.port), ("127.0.0.1", self.port)]
        bound = False
        last_err = None

        for addr in bind_addrs:
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
                last_err = e

        if not bound:
            self.error_count += 1
            self.error_message = f"Failed binding syslog port {self.port}: {last_err}"
            print(f"[{self.collector_id}] {self.error_message}")'''

if target in content:
    content = content.replace(target, replacement, 1)
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print('Updated syslog_collector.py')
else:
    print('Target not found in syslog_collector.py')
