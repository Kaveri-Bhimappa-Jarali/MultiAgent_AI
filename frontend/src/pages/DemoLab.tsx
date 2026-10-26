import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketContext';
import { Modal } from '../components/common/Modal';
import {
  FlaskConical,
  Play,
  Square,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  Layers,
  Bot,
  Zap,
  Radio,
  FileCode,
  Terminal,
  Activity
} from 'lucide-react';

export const DemoLab: React.FC = () => {
  // Continuous stream state
  const [streamScenario, setStreamScenario] = useState('scenario_1');
  const [streamRate, setStreamRate] = useState(1.0);
  const [streamStatus, setStreamStatus] = useState<any>({ is_streaming: false, is_paused: false });
  const [streamLogs, setStreamLogs] = useState<any[]>([]);
  const [streamActionLoading, setStreamActionLoading] = useState(false);

  // One-shot scenario state
  const [runningScenario, setRunningScenario] = useState<number | null>(null);
  const [scenarioResult, setScenarioResult] = useState<any | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<any | null>(null);
  const navigate = useNavigate();
  const { subscribe } = useWebSocket();

  const fetchStreamStatus = async () => {
    try {
      const colRes = await api.getCollectorsHealth();
      const demoCol = (colRes.collectors || []).find((c: any) => c.collector_id === 'collector-demo-stream');
      if (demoCol) {
        setStreamStatus({
          is_streaming: demoCol.is_running && demoCol.status !== 'STOPPED',
          is_paused: Boolean(demoCol.is_paused),
          total_sent: demoCol.total_received
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStreamStatus();
  }, []);

  // Listen to WebSocket events to populate live stream terminal logs
  useEffect(() => {
    const unsub1 = subscribe('EVENT_INGESTED', (evt: any) => {
      if (evt.is_simulated || evt.source_type === 'DEMO_STREAM') {
        setStreamLogs((prev) => [
          {
            timestamp: new Date().toLocaleTimeString(),
            type: 'INGEST',
            text: `[INGESTED] ${evt.event_id} (${evt.event_type.toUpperCase()}) ${evt.source_ip || ''} -> ${evt.destination_ip || evt.host || ''}`
          },
          ...prev.slice(0, 40)
        ]);
      }
    });

    const unsub2 = subscribe('DETECTION_TRIGGERED', (finding: any) => {
      setStreamLogs((prev) => [
        {
          timestamp: new Date().toLocaleTimeString(),
          type: 'DETECTION',
          text: `[DETECTION] ${finding.rule_name} (Confidence: ${Math.round(finding.confidence * 100)}%)`
        },
        ...prev.slice(0, 40)
      ]);
    });

    const unsub3 = subscribe('INCIDENT_UPDATED', (inc: any) => {
      setStreamLogs((prev) => [
        {
          timestamp: new Date().toLocaleTimeString(),
          type: 'INCIDENT',
          text: `[INCIDENT] ${inc.incident_id} Correlated - Risk Score: ${inc.risk_score}/100`
        },
        ...prev.slice(0, 40)
      ]);
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [subscribe]);

  const handleControlStream = async (action: 'start' | 'pause' | 'resume' | 'stop') => {
    try {
      setStreamActionLoading(true);
      await api.controlDemoStream({
        action,
        scenario: streamScenario,
        rate: streamRate
      });
      await fetchStreamStatus();
    } catch (err) {
      console.error(`Failed stream action ${action}:`, err);
    } finally {
      setStreamActionLoading(false);
    }
  };

  const scenarios = [
    {
      id: 1,
      title: 'Scenario 1: Brute-Force Authentication Attack',
      description: 'Simulates rapid failed SSH/RDP login attempts against service host. Triggers Authentication Agent, creates high-risk incident, recommends perimeter IP block, and verifies threat containment.',
      tactics: ['Initial Access', 'Credential Access (T1110)'],
      entities: 'Attacker IP: 185.220.101.45 → Account: sarah.connor → Host: AUTH-SRV-01',
      action: 'Block Attacker IP on Perimeter Firewall',
    },
    {
      id: 2,
      title: 'Scenario 2: Network Reconnaissance & Port Scanning',
      description: 'Simulates high-velocity multi-port reconnaissance sweep targeting internal assets. Network Monitoring Agent uncovers port diversity, maps attack-path topology, and executes perimeter firewall drop.',
      tactics: ['Reconnaissance (T1046)', 'Discovery'],
      entities: 'Scanner IP: 192.0.2.144 → 14 Probed Service Ports → Host: WEB-PROD-01',
      action: 'Firewall Ingress Drop Rule',
    },
    {
      id: 3,
      title: 'Scenario 3: Multi-Stage Account Compromise & Data Access',
      description: 'Full multi-stage cyber intrusion: Initial VPN failure burst followed by successful login, privilege escalation via sudo, and sensitive database backup archive access. Correlation Agent chains lifecycle.',
      tactics: ['Credential Abuse (T1078)', 'Privilege Escalation (T1548)', 'Collection (T1005)'],
      entities: 'C2 IP: 198.51.100.23 → User: vikram.sharma → Host: DB-FIN-01 → /var/backups',
      action: 'Disable User Account & Isolate Database Host',
    },
    {
      id: 4,
      title: 'Scenario 4: Suspicious Living-Off-The-Land Endpoint Activity',
      description: 'Simulates ransomware execution behavior: certutil payload download, obfuscated PowerShell execution, and Volume Shadow Copy deletion via vssadmin. Endpoint & Malicious Behaviour Agents trigger.',
      tactics: ['Execution (T1059.001)', 'Inhibit System Recovery (T1490)'],
      entities: 'Host: WS-DEV-108 → Binaries: certutil, powershell, vssadmin',
      action: 'Isolate Host Endpoint Network via EDR',
    },
  ];

  const handleRunScenario = async (id: number) => {
    try {
      setRunningScenario(id);
      setScenarioResult(null);
      setResetResult(null);
      const res = await api.triggerScenario(id);
      setScenarioResult(res);
    } catch (err) {
      console.error(`Failed to run scenario ${id}`, err);
    } finally {
      setRunningScenario(null);
    }
  };

  const handleResetLab = async () => {
    try {
      setResetting(true);
      const res = await api.resetDemoLab();
      setResetResult(res);
      setScenarioResult(null);
      setResetModalOpen(false);
      setStreamLogs([]);
    } catch (err) {
      console.error('Failed to reset lab', err);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-navy-700/80 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-softwhite flex items-center space-x-2">
            <span>DEMO ATTACK LAB & REAL-TIME STREAM CONTROLLER</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30 font-mono">
              CONTINUOUS TESTBED
            </span>
          </h1>
          <p className="text-xs text-mutedslate mt-1 font-mono">
            Stream live continuous attack telemetry to demonstrate automated hands-free detection, agent reasoning and SOAR verification.
          </p>
        </div>

        <button
          onClick={() => setResetModalOpen(true)}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-red-500/15 border border-soccritical/40 hover:bg-red-500/25 text-soccritical text-xs font-mono font-medium transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Demo Lab Data</span>
        </button>
      </div>

      {/* CONTINUOUS LIVE ATTACK STREAM CONTROLLER PANEL */}
      <div className="p-6 rounded-2xl bg-navy-800 border border-royal/40 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-navy-700 gap-3">
          <div className="flex items-center space-x-2.5">
            <Radio className="w-5 h-5 text-gold animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-softwhite font-mono">Continuous Real-Time Attack Stream Generator</h3>
              <p className="text-xs text-mutedslate font-mono">Injects real-time event sequences at controlled velocity into ingestion queues.</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 font-mono text-xs">
            <span className="text-mutedslate">State:</span>
            <span className={`px-2.5 py-0.5 rounded font-bold ${
              streamStatus.is_streaming && !streamStatus.is_paused ? 'bg-emerald-500/20 text-socsuccess border border-socsuccess/40 animate-pulse' :
              streamStatus.is_paused ? 'bg-amber-500/20 text-socwarning border border-socwarning/40' :
              'bg-slate-700/30 text-slate-400 border border-slate-600'
            }`}>
              {streamStatus.is_streaming && !streamStatus.is_paused ? 'STREAMING ACTIVE' : streamStatus.is_paused ? 'PAUSED' : 'IDLE'}
            </span>
          </div>
        </div>

        {/* Stream Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div>
            <label className="block text-mutedslate mb-1">Select Attack Scenario</label>
            <select
              value={streamScenario}
              onChange={(e) => setStreamScenario(e.target.value)}
              disabled={streamStatus.is_streaming}
              className="w-full bg-navy-900 border border-slate-700 rounded-xl p-2.5 text-softwhite focus:border-royal outline-none"
            >
              <option value="scenario_1">Scenario 1: Brute-Force SSH Auth Bursts (T1110)</option>
              <option value="scenario_2">Scenario 2: Network Port Sweep & Discovery (T1046)</option>
              <option value="scenario_3">Scenario 3: Multi-Stage Account Compromise (APT29)</option>
              <option value="scenario_4">Scenario 4: LOLBin & Shadow Copy Deletion (T1490)</option>
              <option value="normal_enterprise">Normal Enterprise Baseline Office Telemetry</option>
            </select>
          </div>

          <div>
            <label className="block text-mutedslate mb-1">
              Streaming Velocity: <span className="text-gold font-bold">{streamRate} events/sec</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="4.0"
              step="0.5"
              value={streamRate}
              onChange={(e) => setStreamRate(parseFloat(e.target.value))}
              disabled={streamStatus.is_streaming}
              className="w-full accent-royal mt-2 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>0.5 eps (Slow)</span>
              <span>2.0 eps (Medium)</span>
              <span>4.0 eps (Fast Burst)</span>
            </div>
          </div>

          <div className="flex items-end space-x-2">
            {!streamStatus.is_streaming ? (
              <button
                onClick={() => handleControlStream('start')}
                disabled={streamActionLoading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-royal to-purple-700 hover:from-royal-600 text-softwhite font-bold text-xs font-mono transition shadow-lg shadow-royal/25 flex items-center justify-center space-x-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Continuous Stream</span>
              </button>
            ) : (
              <>
                {!streamStatus.is_paused ? (
                  <button
                    onClick={() => handleControlStream('pause')}
                    disabled={streamActionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500/20 text-socwarning border border-socwarning/40 hover:bg-amber-500/30 font-bold transition flex items-center justify-center space-x-1.5"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleControlStream('resume')}
                    disabled={streamActionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 text-socsuccess border border-socsuccess/40 hover:bg-emerald-500/30 font-bold transition flex items-center justify-center space-x-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume</span>
                  </button>
                )}

                <button
                  onClick={() => handleControlStream('stop')}
                  disabled={streamActionLoading}
                  className="px-4 py-2.5 rounded-xl bg-red-500/20 text-soccritical border border-soccritical/40 hover:bg-red-500/30 font-bold transition flex items-center justify-center space-x-1.5"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Live Stream Terminal Output */}
        <div className="pt-2">
          <div className="flex items-center justify-between pb-1.5 text-[11px] font-mono text-mutedslate">
            <span className="flex items-center space-x-1.5">
              <Terminal className="w-3.5 h-3.5 text-royal-200" />
              <span>Live Pipeline Processing Terminal</span>
            </span>
            <span>{streamLogs.length} events received</span>
          </div>

          <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 font-mono text-[11px] h-44 overflow-y-auto space-y-1">
            {streamLogs.length === 0 ? (
              <p className="text-slate-500 text-center py-14">
                Stream is idle. Click "Start Continuous Stream" or launch a scenario to observe hands-free real-time detection telemetry.
              </p>
            ) : (
              streamLogs.map((log, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <span className="text-slate-500 flex-shrink-0">[{log.timestamp}]</span>
                  <span className={
                    log.type === 'INGEST' ? 'text-slate-300' :
                    log.type === 'DETECTION' ? 'text-gold font-bold' :
                    'text-soccritical font-bold'
                  }>
                    {log.text}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Reset Confirmation Result */}
      {resetResult && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-socsuccess/40 text-xs font-mono text-softwhite flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-socsuccess flex-shrink-0" />
          <div>
            <span className="font-semibold text-socsuccess">Demo Lab Environment Cleared: </span>
            Removed {resetResult.simulated_incidents_cleared} simulated incidents and {resetResult.simulated_events_cleared} events. Core system configuration preserved.
          </div>
        </div>
      )}

      {/* 4 One-Shot Attack Scenarios Grid */}
      <div className="pt-2">
        <h2 className="text-base font-bold text-softwhite font-sans mb-3 flex items-center space-x-2">
          <Shield className="w-4 h-4 text-royal-200" />
          <span>One-Shot Reproducible Attack Scenarios</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {scenarios.map((sc) => {
            const isRunning = runningScenario === sc.id;
            return (
              <div
                key={sc.id}
                className="p-6 rounded-2xl bg-navy-800 border border-slate-800 hover:border-royal/50 transition flex flex-col justify-between shadow-xl space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30 font-mono font-bold">
                      SCENARIO #{sc.id}
                    </span>
                    <div className="flex items-center space-x-1 text-[10px] font-mono text-mutedslate">
                      <Radio className="w-3.5 h-3.5 text-royal-200" />
                      <span>Deterministic Flow</span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-softwhite font-sans">{sc.title}</h3>
                  <p className="text-xs text-mutedslate mt-2 leading-relaxed font-sans">{sc.description}</p>

                  <div className="mt-4 pt-3 border-t border-navy-700/60 space-y-2 text-xs font-mono">
                    <div className="text-slate-300">
                      <span className="text-mutedslate">MITRE ATT&CK: </span>
                      <span className="text-gold font-semibold">{sc.tactics.join(' • ')}</span>
                    </div>
                    <div className="text-slate-300 text-[11px]">
                      <span className="text-mutedslate">Topology: </span>
                      {sc.entities}
                    </div>
                    <div className="text-slate-300 text-[11px]">
                      <span className="text-mutedslate">Automated Defense: </span>
                      <span className="text-socsuccess font-semibold">{sc.action}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRunScenario(sc.id)}
                  disabled={runningScenario !== null}
                  className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-royal to-purple-700 hover:from-royal-600 text-softwhite font-medium text-xs font-mono transition shadow-lg shadow-royal/25 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-spin' : ''}`} />
                  <span>{isRunning ? 'Injecting Attack Telemetry & Triggering Pipeline...' : 'Launch Attack Scenario'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Confirm Demo Lab Reset"
        maxWidth="md"
      >
        <div className="space-y-4 font-mono text-xs">
          <p className="text-slate-300 font-sans">
            Are you sure you want to purge all simulated demo telemetry events, attack incidents, and verification runs?
          </p>
          <div className="p-3 rounded-lg bg-navy-900 border border-slate-700 text-gold text-[11px]">
            Real detection rules, user accounts, and curated threat intelligence indicators will remain intact.
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button
              onClick={() => setResetModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-navy-900 border border-slate-700 text-mutedslate hover:text-softwhite transition"
            >
              Cancel
            </button>
            <button
              onClick={handleResetLab}
              disabled={resetting}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-softwhite font-bold transition disabled:opacity-50"
            >
              {resetting ? 'Resetting...' : 'Yes, Reset Demo Data'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
