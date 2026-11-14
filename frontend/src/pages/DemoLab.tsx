import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { api } from '../api/client';
import { useWebSocket } from '../context/WebSocketContext';
import { formatSocTimestamp } from '../utils/timestamps.js';
import { Modal } from '../components/common/Modal';
import {
  Play,
  Square,
  Pause,
  RotateCcw,
  CheckCircle2,
  Shield,
  Radio,
  Terminal
} from 'lucide-react';

type StreamState = 'IDLE' | 'STARTING' | 'STREAMING' | 'PAUSED' | 'STOPPED' | 'ERROR';

interface DemoStreamStatus {
  stream_state: StreamState;
  is_streaming?: boolean;
  is_paused?: boolean;
  current_scenario?: string;
  total_received?: number;
  total_processed?: number;
  error_message?: string | null;
}

interface StreamLog {
  id: string;
  timestamp: string;
  type: 'INGEST' | 'PROCESS' | 'DETECTION' | 'INCIDENT' | 'AGENT' | 'STREAM' | 'ERROR';
  text: string;
}

export const DemoLab: React.FC = () => {
  const [streamScenario, setStreamScenario] = useState('scenario_1');
  const [streamRate, setStreamRate] = useState(1.0);
  const [streamStatus, setStreamStatus] = useState<DemoStreamStatus>({ stream_state: 'IDLE' });
  const [streamLogs, setStreamLogs] = useState<StreamLog[]>([]);
  const [receivedEventCount, setReceivedEventCount] = useState(0);
  const [streamActionLoading, setStreamActionLoading] = useState(false);
  const [streamStatusLoading, setStreamStatusLoading] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);

  const [runningScenario, setRunningScenario] = useState<number | null>(null);
  const [scenarioResult, setScenarioResult] = useState<any | null>(null);
  const [scenarioError, setScenarioError] = useState<string | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<any | null>(null);
  const { subscribe } = useWebSocket();
  const streamActiveRef = useRef(false);

  const appendStreamLog = useCallback((
    type: StreamLog['type'],
    text: string,
    id = `${Date.now()}-${Math.random()}`
  ) => {
    setStreamLogs((previous) => [
      { id, timestamp: formatSocTimestamp(new Date()), type, text },
      ...previous
    ].slice(0, 100));
  }, []);

  const fetchStreamStatus = useCallback(async () => {
    try {
      const colRes = await api.getCollectorsHealth();
      const demoCol = (colRes.collectors || []).find(
        (collector: any) => collector.collector_id === 'collector-demo-stream'
      );
      if (!demoCol) {
        throw new Error('Demo stream collector was not returned by the backend');
      }
      setStreamStatus({
        ...demoCol,
        stream_state: demoCol.stream_state || 'ERROR'
      });
      if (demoCol.error_message) setStreamError(demoCol.error_message);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load demo stream status';
      setStreamError(message);
    } finally {
      setStreamStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStreamStatus();
    const statusTimer = window.setInterval(() => {
      void fetchStreamStatus();
    }, 3000);
    return () => window.clearInterval(statusTimer);
  }, [fetchStreamStatus]);

  useEffect(() => {
    const state = streamStatus.stream_state;
    streamActiveRef.current = state === 'STARTING' || state === 'STREAMING' || state === 'PAUSED';
  }, [streamStatus.stream_state]);

  useEffect(() => () => {
    if (streamActiveRef.current) {
      void api.controlDemoStream({ action: 'stop' }).catch((err) => {
        console.error('Failed to stop demo stream when leaving Demo Attack Lab:', err);
      });
    }
  }, []);

  useEffect(() => {
    const unsubIngested = subscribe('EVENT_INGESTED', (evt: any) => {
      if (!evt.is_simulated && evt.source_type !== 'DEMO_STREAM' && evt.source_type !== 'DEMO_SCENARIO') return;
      setReceivedEventCount((count) => count + 1);
      appendStreamLog(
        'INGEST',
        `[INGESTED] ${evt.event_id} (${String(evt.event_type || 'event').toUpperCase()}) ${evt.source_ip || ''} -> ${evt.destination_ip || evt.host || ''}`,
        `ingest-${evt.event_id}`
      );
    });

    const unsubProcessed = subscribe('EVENT_PROCESSED', (event: any) => {
      appendStreamLog(
        'PROCESS',
        `[PROCESSED] ${event.event_id}: ${event.detection_findings_count} detection(s), ${event.agents_executed} agent execution(s)`,
        `processed-${event.event_id}`
      );
    });

    const unsubDetection = subscribe('DETECTION_TRIGGERED', (finding: any) => {
      appendStreamLog(
        'DETECTION',
        `[DETECTION] ${finding.rule_name || finding.rule_id || 'Detection'} (Confidence: ${Math.round(Number(finding.confidence || 0) * 100)}%)`
      );
    });

    const unsubIncident = subscribe('INCIDENT_UPDATED', (incident: any) => {
      appendStreamLog(
        'INCIDENT',
        `[INCIDENT] ${incident.incident_id} correlated; risk ${incident.risk_score ?? 'not scored'}/100`
      );
    });

    const unsubAgent = subscribe('AGENT_STATUS_CHANGED', (agent: any) => {
      if (agent.event_id || agent.status !== 'RUNNING') {
        appendStreamLog(
          'AGENT',
          `[AGENT] ${agent.name || 'Agent'} ${String(agent.status || 'updated').toLowerCase()}${agent.findings_count !== undefined ? `; ${agent.findings_count} finding(s)` : ''}`
        );
      }
    });

    return () => {
      unsubIngested();
      unsubProcessed();
      unsubDetection();
      unsubIncident();
      unsubAgent();
    };
  }, [appendStreamLog, subscribe]);

  const handleControlStream = async (action: 'start' | 'pause' | 'resume' | 'stop') => {
    try {
      setStreamActionLoading(true);
      setStreamError(null);
      const response = await api.controlDemoStream({
        action,
        scenario: streamScenario,
        rate: streamRate
      });
      setStreamStatus(response.collector_status);
      streamActiveRef.current = ['STARTING', 'STREAMING', 'PAUSED'].includes(
        response.collector_status.stream_state
      );
      setStreamError(null);
      appendStreamLog('STREAM', `[STREAM] ${response.message}`);
      await fetchStreamStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${action} demo stream`;
      setStreamError(message);
      appendStreamLog('ERROR', `[API ERROR] ${message}`);
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
      setScenarioError(null);
      setResetResult(null);
      const res = await api.triggerScenario(id);
      setScenarioResult(res);
      appendStreamLog(
        'STREAM',
        `[SCENARIO] ${res.scenario}: ${res.events_generated} event(s) accepted; ${res.events_queued} queued for processing`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to launch scenario ${id}`;
      setScenarioError(message);
      appendStreamLog('ERROR', `[API ERROR] Scenario ${id}: ${message}`);
    } finally {
      setRunningScenario(null);
    }
  };

  const handleResetLab = async () => {
    try {
      setResetting(true);
      if (streamActiveRef.current) {
        const stopped = await api.controlDemoStream({ action: 'stop' });
        setStreamStatus(stopped.collector_status);
        streamActiveRef.current = false;
      }
      const res = await api.resetDemoLab();
      setResetResult(res);
      setScenarioResult(null);
      setScenarioError(null);
      setStreamError(null);
      setResetModalOpen(false);
      setStreamLogs([]);
      setReceivedEventCount(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset demo lab';
      setScenarioError(message);
    } finally {
      setResetting(false);
    }
  };

  const activeStreamStates: StreamState[] = ['STARTING', 'STREAMING', 'PAUSED'];
  const streamIsActive = activeStreamStates.includes(streamStatus.stream_state);
  const streamStateStyles: Record<StreamState, string> = {
    IDLE: 'bg-slate-700/30 text-slate-400 border border-slate-600',
    STARTING: 'bg-sky-500/20 text-sky-300 border border-sky-400/40 animate-pulse',
    STREAMING: 'bg-emerald-500/20 text-socsuccess border border-socsuccess/40 animate-pulse',
    PAUSED: 'bg-amber-500/20 text-socwarning border border-socwarning/40',
    STOPPED: 'bg-slate-700/30 text-slate-400 border border-slate-600',
    ERROR: 'bg-red-500/20 text-soccritical border border-soccritical/40'
  };

  return (
    <div className="space-y-6">
      {/* Beginner-Friendly Page Header */}
      <PageHeader
        title="Demo Attack Lab"
        badge="Continuous Testbed"
        badgeVariant="gold"
        description="Launch simulated attack scenarios to observe live hands-free detection, multi-agent reasoning, and automated SOAR containment verification."
        actions={
          <button
            onClick={() => setResetModalOpen(true)}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-red-500/15 border border-soccritical/40 hover:bg-red-500/25 text-soccritical text-xs font-mono font-medium transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Lab Data</span>
          </button>
        }
      />

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
            <span className={`px-2.5 py-0.5 rounded font-bold ${streamStateStyles[streamStatus.stream_state]}`}>
              {streamStatusLoading ? 'CONNECTING' : streamStatus.stream_state}
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
              disabled={streamIsActive || streamStatusLoading || streamActionLoading}
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
              disabled={streamIsActive || streamStatusLoading || streamActionLoading}
              className="w-full accent-royal mt-2 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>0.5 eps (Slow)</span>
              <span>2.0 eps (Medium)</span>
              <span>4.0 eps (Fast Burst)</span>
            </div>
          </div>

          <div className="flex items-end space-x-2">
            {!streamIsActive ? (
              <button
                onClick={() => handleControlStream('start')}
                disabled={streamActionLoading || streamStatusLoading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-royal to-purple-700 hover:from-royal-600 text-softwhite font-bold text-xs font-mono transition shadow-lg shadow-royal/25 flex items-center justify-center space-x-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Continuous Stream</span>
              </button>
            ) : (
              <>
                {streamStatus.stream_state === 'STREAMING' || streamStatus.stream_state === 'STARTING' ? (
                  <button
                    onClick={() => handleControlStream('pause')}
                    disabled={streamActionLoading || streamStatus.stream_state === 'STARTING'}
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

        {(streamError || streamStatus.error_message) && (
          <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-soccritical/40 text-soccritical text-xs font-mono">
            Demo stream error: {streamError || streamStatus.error_message}
          </div>
        )}

        {/* Live Stream Terminal Output */}
        <div className="pt-2">
          <div className="flex items-center justify-between pb-1.5 text-[11px] font-mono text-mutedslate">
            <span className="flex items-center space-x-1.5">
              <Terminal className="w-3.5 h-3.5 text-royal-200" />
              <span>Live Pipeline Processing Terminal</span>
            </span>
            <span>{receivedEventCount} events received</span>
          </div>

          <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 font-mono text-[11px] h-44 overflow-y-auto space-y-1">
            {streamLogs.length === 0 ? (
              <p className="text-slate-500 text-center py-14">
                {streamError
                  ? `Unable to show live pipeline activity: ${streamError}`
                  : streamIsActive
                    ? 'Waiting for event ingestion and processing updates from the SOC backend...'
                    : 'No demo events received yet. Start a stream or launch an attack scenario.'}
              </p>
            ) : (
              streamLogs.map((log) => (
                <div key={log.id} className="flex items-start space-x-2">
                  <span className="text-slate-500 flex-shrink-0">[{log.timestamp}]</span>
                  <span className={
                    ['INGEST', 'PROCESS', 'AGENT', 'STREAM'].includes(log.type) ? 'text-slate-300' :
                    log.type === 'DETECTION' ? 'text-gold font-bold' :
                    ['ERROR', 'INCIDENT'].includes(log.type) ? 'text-soccritical font-bold' :
                    'text-slate-300'
                  }>
                    {log.text}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {scenarioError && (
        <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-soccritical/40 text-soccritical text-xs font-mono">
          Scenario error: {scenarioError}
        </div>
      )}

      {scenarioResult && (
        <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-400/30 text-xs font-mono text-softwhite">
          <span className="font-semibold text-sky-300">Scenario accepted by the SOC pipeline: </span>
          {scenarioResult.scenario}. {scenarioResult.ingestion?.accepted ?? scenarioResult.events_generated} event(s)
          accepted and {scenarioResult.ingestion?.queued_for_processing ?? scenarioResult.events_queued} queued for processing.
          Processing, detections and agent results will appear here as the backend broadcasts them.
        </div>
      )}

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
