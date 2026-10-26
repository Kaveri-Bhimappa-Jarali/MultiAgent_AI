import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useWebSocket } from '../context/WebSocketContext';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Server,
  Monitor,
  Skull,
  Shield,
  Activity,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Wifi,
  WifiOff,
  Terminal,
  Cpu,
  Layers,
  FileCode,
  Zap,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const VirtualLab: React.FC = () => {
  const [nodes, setNodes] = useState<any[]>([]);
  const [diagnostics, setDiagnostics] = useState<any | null>(null);
  const [vmLogs, setVmLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'topology' | 'setup' | 'containment'>('topology');
  const [attackRunning, setAttackRunning] = useState<string | null>(null);
  const [attackOutput, setAttackOutput] = useState<string | null>(null);
  const navigate = useNavigate();
  const { subscribe, status: wsStatus } = useWebSocket();

  const fetchLabState = async () => {
    try {
      setLoading(true);
      const res = await (api as any).getVMNodes();
      setNodes(res.nodes || []);
      const diag = await (api as any).getVMDiagnostics();
      setDiagnostics(diag);
    } catch (err) {
      console.error('Failed to load Virtual Lab state', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabState();
    const interval = setInterval(fetchLabState, 6000);
    return () => clearInterval(interval);
  }, []);

  // Listen to live WebSocket events from virtual machines
  useEffect(() => {
    const unsub1 = subscribe('EVENT_INGESTED', (evt: any) => {
      if (evt.source_type && evt.source_type.startsWith('VM_')) {
        setVmLogs((prev) => [
          {
            timestamp: new Date().toLocaleTimeString(),
            vm: evt.host || 'VM-NODE',
            type: evt.event_type,
            summary: evt.command_line || evt.file_action || evt.event_type
          },
          ...prev.slice(0, 30)
        ]);
      }
    });

    const unsub2 = subscribe('VM_STATUS_CHANGED', () => {
      fetchLabState();
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [subscribe]);

  const handleRunLabAttack = async (scenario: string, targetIp: string) => {
    try {
      setAttackRunning(scenario);
      setAttackOutput(null);

      // Trigger controlled scenario via test sender targeting designated lab IP
      const res = await (api as any).runVMScenario({ scenario, target_ip: targetIp });
      setAttackOutput(res.message || `Scenario ${scenario} initiated from Attacker VM (192.168.56.20) targeting ${targetIp}`);
      await fetchLabState();
    } catch (err: any) {
      setAttackOutput(`Error running scenario: ${err.message || err}`);
    } finally {
      setAttackRunning(null);
    }
  };

  const getNodeIcon = (role: string) => {
    switch (role) {
      case 'ATTACKER':
        return <Skull className="w-5 h-5 text-soccritical" />;
      case 'SERVER':
        return <Server className="w-5 h-5 text-gold" />;
      case 'ENDPOINT':
      default:
        return <Monitor className="w-5 h-5 text-royal-200" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-navy-700/80 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-softwhite flex items-center space-x-2">
            <span>VIRTUAL ENTERPRISE NETWORK LAB</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30 font-mono">
              ISOLATED SUBNET 192.168.56.0/24
            </span>
          </h1>
          <p className="text-xs text-mutedslate mt-1 font-mono">
            Multi-system virtualization testbed: Attacker VM, Endpoint Workstation VM, Internal Server VM, and SOC Host.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchLabState}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-navy-800 border border-slate-700 text-mutedslate hover:text-softwhite text-xs font-mono transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Lab State</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-navy-700 pb-2 text-xs font-mono">
        <button
          onClick={() => setActiveTab('topology')}
          className={`px-3 py-1.5 rounded-lg transition ${
            activeTab === 'topology' ? 'bg-royal/20 text-softwhite border border-royal/40 font-bold' : 'text-mutedslate hover:text-softwhite'
          }`}
        >
          Network Topology & Live Nodes ({nodes.length})
        </button>
        <button
          onClick={() => setActiveTab('setup')}
          className={`px-3 py-1.5 rounded-lg transition ${
            activeTab === 'setup' ? 'bg-royal/20 text-softwhite border border-royal/40 font-bold' : 'text-mutedslate hover:text-softwhite'
          }`}
        >
          Vagrant & Hypervisor Setup Guide
        </button>
      </div>

      {activeTab === 'topology' && (
        <div className="space-y-6">
          {/* Virtual Enterprise Topology Diagram */}
          <div className="p-6 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-softwhite font-mono flex items-center space-x-2">
              <Layers className="w-4 h-4 text-gold" />
              <span>Multi-Machine Enterprise Network Architecture</span>
            </h3>

            <div className="p-4 rounded-xl bg-navy-950 border border-navy-700/80 font-mono text-xs">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                {/* Attacker VM Box */}
                <div className="p-4 rounded-xl bg-navy-900 border border-red-500/40 space-y-2">
                  <div className="flex items-center justify-center space-x-2 text-soccritical font-bold">
                    <Skull className="w-4 h-4" />
                    <span>ATTACKER VM</span>
                  </div>
                  <p className="text-xs text-softwhite">192.168.56.20</p>
                  <p className="text-[10px] text-mutedslate">Kali / Alpine Testbed</p>
                  <span className="inline-block px-2 py-0.5 rounded bg-red-500/15 text-soccritical text-[9px]">
                    Isolated (No Public Bridge)
                  </span>
                </div>

                {/* Arrow */}
                <div className="hidden md:flex flex-col items-center justify-center text-mutedslate space-y-1">
                  <span className="text-[10px] text-socwarning">TCP Probes / SSH</span>
                  <ArrowRight className="w-5 h-5 text-gold animate-pulse" />
                  <span className="text-[10px]">Private Subnet</span>
                </div>

                {/* Target VMs Column */}
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-navy-900 border border-blue-500/40 text-left">
                    <div className="flex items-center space-x-1.5 text-blue-300 font-bold">
                      <Monitor className="w-3.5 h-3.5" />
                      <span>ENDPOINT VM (.10)</span>
                    </div>
                    <p className="text-[10px] text-mutedslate">User: sarah.connor</p>
                  </div>

                  <div className="p-3 rounded-xl bg-navy-900 border border-amber-500/40 text-left">
                    <div className="flex items-center space-x-1.5 text-gold font-bold">
                      <Server className="w-3.5 h-3.5" />
                      <span>SERVER VM (.15)</span>
                    </div>
                    <p className="text-[10px] text-mutedslate">DB Backup, SSH Daemon</p>
                  </div>
                </div>

                {/* SOC Host Box */}
                <div className="p-4 rounded-xl bg-royal/15 border border-royal/40 space-y-2">
                  <div className="flex items-center justify-center space-x-2 text-royal-200 font-bold">
                    <Shield className="w-4 h-4" />
                    <span>SOC HOST</span>
                  </div>
                  <p className="text-xs text-softwhite">192.168.56.1:8000</p>
                  <p className="text-[10px] text-mutedslate">10 AI Agents & Engine</p>
                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/15 text-socsuccess text-[9px] font-bold">
                    Telemetry Ingress Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Virtual Machine Nodes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {nodes.map((n) => (
              <div
                key={n.vm_id}
                className="p-5 rounded-2xl bg-navy-800 border border-slate-800 hover:border-royal/50 transition shadow-xl space-y-3 font-mono text-xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-navy-700">
                  <div className="flex items-center space-x-2">
                    {getNodeIcon(n.role)}
                    <span className="font-bold text-softwhite">{n.name}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    n.status === 'RECEIVING_TELEMETRY' ? 'bg-emerald-500/20 text-socsuccess border border-socsuccess/40 animate-pulse' :
                    n.status === 'CONNECTED' ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40' :
                    n.status === 'ISOLATED' ? 'bg-red-500/20 text-soccritical border border-soccritical/40' :
                    'bg-slate-700/30 text-slate-400 border border-slate-600'
                  }`}>
                    {n.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-slate-300 text-[11px]">
                  <div>IP Address: <span className="text-royal-200 font-bold">{n.ip_address}</span></div>
                  <div>Role: <span className="text-gold">{n.role}</span></div>
                  <div>OS Platform: <span className="text-slate-400">{n.os_info}</span></div>
                  <div>Events Forwarded: <span className="text-softwhite font-bold">{n.events_count}</span></div>
                  <div>Last Telemetry: <span className="text-slate-400">{n.last_telemetry_at ? new Date(n.last_telemetry_at).toLocaleTimeString() : 'Awaiting guest daemon'}</span></div>
                </div>

                <div className="pt-2 border-t border-navy-700/80">
                  <span className="text-[10px] text-mutedslate uppercase">Active Guest Collectors:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(n.active_collectors || []).map((col: string) => (
                      <span key={col} className="px-1.5 py-0.5 rounded bg-navy-950 text-slate-400 text-[9px] border border-slate-800">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Controlled Lab Attack Testing Controls */}
          <div className="p-6 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-softwhite font-mono flex items-center space-x-2">
              <Play className="w-4 h-4 text-soccritical fill-current" />
              <span>Execute Authorized Lab Attack Scenarios from Attacker VM (192.168.56.20)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <button
                onClick={() => handleRunLabAttack('brute_force', '192.168.56.15')}
                disabled={attackRunning !== null}
                className="p-4 rounded-xl bg-navy-900 border border-slate-700 hover:border-soccritical text-left space-y-2 transition disabled:opacity-50"
              >
                <div className="font-bold text-softwhite flex items-center justify-between">
                  <span>Scenario A: SSH Brute Force</span>
                  <span className="text-[10px] text-gold font-normal">Target: .15 (Server)</span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  Initiates 4 failed SSH attempts with invalid usernames. Triggers Server VM auth log, Authentication Agent, and firewall block recommendation.
                </p>
                <span className="text-[10px] text-soccritical font-bold flex items-center space-x-1">
                  <span>{attackRunning === 'brute_force' ? 'Executing TCP probes...' : 'Run Scenario A →'}</span>
                </span>
              </button>

              <button
                onClick={() => handleRunLabAttack('port_scan', '192.168.56.15')}
                disabled={attackRunning !== null}
                className="p-4 rounded-xl bg-navy-900 border border-slate-700 hover:border-socwarning text-left space-y-2 transition disabled:opacity-50"
              >
                <div className="font-bold text-softwhite flex items-center justify-between">
                  <span>Scenario B: Network Port Scan</span>
                  <span className="text-[10px] text-gold font-normal">Target: .15 (Server)</span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  Attacker VM executes a multi-port TCP connect sweep across 9 ports. Triggers Server VM connection monitoring and Network Agent.
                </p>
                <span className="text-[10px] text-socwarning font-bold flex items-center space-x-1">
                  <span>{attackRunning === 'port_scan' ? 'Scanning ports...' : 'Run Scenario B →'}</span>
                </span>
              </button>

              <button
                onClick={() => handleRunLabAttack('multi_stage', '192.168.56.15')}
                disabled={attackRunning !== null}
                className="p-4 rounded-xl bg-navy-900 border border-slate-700 hover:border-royal text-left space-y-2 transition disabled:opacity-50"
              >
                <div className="font-bold text-softwhite flex items-center justify-between">
                  <span>Scenario C: Multi-Stage Intrusion</span>
                  <span className="text-[10px] text-gold font-normal">Target: .15 (Server)</span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans">
                  Simulates complete APT29 intrusion: Login failure burst → Success → Sudo root escalation → Database backup file access.
                </p>
                <span className="text-[10px] text-royal-200 font-bold flex items-center space-x-1">
                  <span>{attackRunning === 'multi_stage' ? 'Executing kill-chain...' : 'Run Scenario C →'}</span>
                </span>
              </button>
            </div>

            {attackOutput && (
              <div className="p-3.5 rounded-xl bg-navy-950 border border-royal/40 text-xs font-mono text-socsuccess flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{attackOutput}</span>
              </div>
            )}
          </div>

          {/* Live Guest Telemetry Stream Drawer */}
          <div className="p-6 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-navy-700">
              <div className="flex items-center space-x-2 text-softwhite font-bold">
                <Terminal className="w-4 h-4 text-royal-200" />
                <span>Live Guest VM Telemetry Stream</span>
              </div>
              <span className="text-mutedslate">{vmLogs.length} events received</span>
            </div>

            <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 h-36 overflow-y-auto space-y-1 text-[11px]">
              {vmLogs.length === 0 ? (
                <p className="text-slate-500 text-center py-10">
                  Awaiting authentic telemetry from VM guest daemons. Start the guest collector or run a test scenario.
                </p>
              ) : (
                vmLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-slate-300">
                    <span className="text-slate-500">[{log.timestamp}]</span>
                    <span className="text-royal-200 font-bold">[{log.vm}]</span>
                    <span className="text-gold">{log.type.toUpperCase()}:</span>
                    <span className="truncate">{log.summary}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'setup' && (
        <div className="p-6 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl space-y-6 font-mono text-xs">
          <div>
            <h3 className="text-base font-bold text-softwhite mb-2">Automated VirtualBox & Vagrant Setup Instructions</h3>
            <p className="text-slate-300 font-sans leading-relaxed">
              The project includes a ready-to-run multi-machine <code className="text-royal-200">Vagrantfile</code> that provisions all 3 virtual machines in Oracle VirtualBox automatically.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-gold uppercase text-[11px]">Option 1: One-Click Multi-Node Local Runner (Immediate Testbed)</h4>
            <div className="p-4 rounded-xl bg-navy-950 border border-slate-700 text-slate-300 space-y-1">
              <p className="text-slate-400"># Runs the 3 isolated virtual guest daemons with heartbeats and socket monitoring:</p>
              <p className="text-softwhite font-bold">.\.venv\Scripts\python.exe virtual-lab\run_local_virtual_nodes.py</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-gold uppercase text-[11px]">Option 2: Oracle VirtualBox + Vagrant Provisioning</h4>
            <div className="p-4 rounded-xl bg-navy-950 border border-slate-700 text-slate-300 space-y-1">
              <p className="text-slate-400"># 1. Install VirtualBox via Windows winget (if not already installed):</p>
              <p className="text-softwhite font-bold">winget install Oracle.VirtualBox</p>
              <p className="text-slate-400 pt-2"># 2. Provision all 3 virtual machines in an isolated private network (192.168.56.0/24):</p>
              <p className="text-softwhite font-bold">cd virtual-lab && vagrant up</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-gold uppercase text-[11px]">Option 3: Manual Guest Collector Execution on any Linux VM</h4>
            <div className="p-4 rounded-xl bg-navy-950 border border-slate-700 text-slate-300 space-y-1">
              <p className="text-slate-400"># Copy virtual-lab/guest-agent/vm_telemetry_collector.py to the guest VM and run:</p>
              <p className="text-softwhite font-bold">python3 vm_telemetry_collector.py http://192.168.56.1:8000 vm-server-01 VM-KEY-SERVER-PROD-2026 /var/log/auth.log</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
