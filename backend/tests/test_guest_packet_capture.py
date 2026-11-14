import importlib.util
from pathlib import Path
import socket
import struct

spec = importlib.util.spec_from_file_location('guest_packet_test', Path(__file__).resolve().parents[2] / 'virtual-lab/guest-agent/vm_telemetry_collector.py')
guest = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guest)


def frame(protocol, flags=2, source='10.0.0.12', destination='10.0.0.11'):
    ethernet = b'\0' * 12 + b'\x08\x00'
    ip = struct.pack('!BBHHHBBH4s4s', 0x45, 0, 40, 0, 0, 64, protocol, 0, socket.inet_aton(source), socket.inet_aton(destination))
    tcp = struct.pack('!HHIIBBHHH', 50000, 80, 0, 0, 0x50, flags, 0, 0, 0)
    udp = struct.pack('!HHHH', 50000, 9999, 8, 0)
    return ethernet + ip + (tcp if protocol == 6 else udp)


def test_observes_short_tcp_and_udp_but_excludes_other_peers(monkeypatch):
    monkeypatch.setenv('SOC_NETWORK_PEER_IP', '10.0.0.12')
    monkeypatch.setattr(guest.VMGuestCollector, '_get_local_ip', lambda _: '10.0.0.11')
    collector = guest.VMGuestCollector()
    assert collector._parse_network_packet(frame(6))[3:5] == (80, 'TCP')
    assert collector._parse_network_packet(frame(17))[3:5] == (9999, 'UDP')
    assert collector._parse_network_packet(frame(6, flags=0x12)) is None
    assert collector._parse_network_packet(frame(6, source='10.0.0.99')) is None
    assert collector._parse_network_packet(frame(6, destination='10.0.0.99')) is None
    assert collector._parse_network_packet(b'short') is None
