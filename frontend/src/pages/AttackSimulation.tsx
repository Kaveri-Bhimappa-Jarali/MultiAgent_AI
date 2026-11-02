import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';
import { useWebSocket } from '../context/WebSocketContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { Modal } from '../components/common/Modal';
import { formatSocTimestamp } from '../utils/timestamps.js';
import {
  Crosshair,
  Server,
  Terminal,
  Play,
  Square,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Shield,
  ArrowRight,
  Wifi,
  WifiOff,
  Radio,
  Clock,
  Layers,
  Cpu,
  Eye,
  Copy,
  ExternalLink,
  Zap,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  SimulationScenario,
  SimulationExecution,
  SimulationConnectivityStatus
} from '../types';

export const AttackSimulation: React.FC = () => {
  // State
  const [status, setStatus] = useState<SimulationConnectivityStatus | null>(null);
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([]);
  const [executions, setExecutions] = useState<SimulationExecution[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [statusRefreshing, setStatusRefreshing] = useState<boolean>(false);

  // Active / Selected Execution
  const [activeExecution, setActiveExecution] = useState<SimulationExecution | null>(null);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);

  // Launch Dialog Modal
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario | null>(null);
  const [configParams, setConfigParams] = useState<Record<string, any>>({});
  const [targetIp, setTargetIp] = useState<string>('10.0.0.14');
  const [launching, setLaunching] = useState<boolean>(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  // Inspect Past Logs Modal
  const [inspectExecution, setInspectExecution] = useState<SimulationExecution | null>(null);

  const { subscribe } = useWebSocket();
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveLogs]);

  // Initial Data Fetch
  const fetchAll = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [st, sc, ex] = await Promise.all([
        api.getSimulationStatus(),
        api.getSimulationScenarios(),
        api.getSimulationExecutions(20)
      ]);
      setStatus(st);
      setScenarios(sc || []);
      setExecutions(ex || []);

      // Check if there is an active running execution
      const running = (ex || []).find((e: SimulationExecution) => e.status === 'RUNNING');
      if (running) {
        setActiveExecution(running);
        if (running.raw_logs) {
          setLiveLogs(running.raw_logs.split('\n'));
        }
      }
    } catch (err) {
      console.error('Failed to fetch attack simulation data', err);
    } finally {
      if (!isSilent) setLoading(false);
      setStatusRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => fetchAll(true), 15000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // WebSocket Live Subscriptions
  useEffect(() => {
    const unsubStarted = subscribe('SIMULATION_STARTED', (data: any) => {
      fetchAll(true);
      setLiveLogs((prev) => [...prev, `[SYSTEM] 🚀 Simulation ${data.scenario_name} (${data.execution_id}) started.`]);
    });

    const unsubLog = subscribe('SIMULATION_LOG', (data: any) => {
      if (data && data.line) {
        setLiveLogs((prev) => [...prev, data.line]);
      }
    });

    const unsubCompleted = subscribe('SIMULATION_COMPLETED', (data: any) => {
      fetchAll(true);
      setLiveLogs((prev) => [
        ...prev,
        `[SYSTEM] 🏁 Simulation ${data.execution_id} COMPLETED. Events: ${data.events_detected || 0}, Findings: ${data.findings_count || 0}`
      ]);
    });

    const unsubStopped = subscribe('SIMULATION_STOPPED', (data: any) => {
      fetchAll(true);
      setLiveLogs((prev) => [...prev, `[SYSTEM] 🛑 Simulation ${data.execution_id} STOPPED by operator.`]);
    });

    return () => {
      unsubStarted();
      unsubLog();
      unsubCompleted();
      unsubStopped();
    };
  }, [subscribe, fetchAll]);

  // Launch handler
  const handleOpenLaunch = (scenario: SimulationScenario) => {
    setSelectedScenario(scenario);
    setConfigParams({ ...scenario.default_parameters });
    setTargetIp(status?.victim_vm?.private_ip || '10.0.0.14');
    setLaunchError(null);
  };

  const handleConfirmLaunch = async () => {
    if (!selectedScenario) return;
    setLaunching(true);
    setLaunchError(null);
    try {
      const res = await api.launchSimulation({
        scenario_id: selectedScenario.scenario_id,
        target_ip: targetIp,
        parameters: configParams
      });
      setActiveExecution(res);
      setLiveLogs([`[SYSTEM] Dispatched simulation '${selectedScenario.name}' (${res.execution_id}) against ${targetIp}`]);
      setSelectedScenario(null);
      await fetchAll(true);
    } catch (err: any) {
      setLaunchError(err.message || 'Failed to dispatch simulation');
    } finally {
      setLaunching(false);
    }
  };

  // Emergency stop handler
  const handleStopSimulation = async () => {
    if (!activeExecution) return;
    try {
      await api.stopSimulation(activeExecution.execution_id, 'Emergency Stop clicked by operator');
      fetchAll(true);
    } catch (err) {
      console.error('Failed to stop simulation', err);
    }
  };

  // Filter categories
  const categories = ['ALL', 'Reconnaissance', 'Authentication', 'Web', 'Network', 'Data Movement'];
  const filteredScenarios = activeCategory === 'ALL'
    ? scenarios
    : scenarios.filter((s) => s.category.toLowerCase() === activeCategory.toLowerCase());

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-navy-900/90 border border-navy-700/80 p-5 rounded-2xl shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-crimson to-orange-600 flex items-center justify-center shadow-lg shadow-crimson/20">
              <Crosshair className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-softwhite font-sans flex items-center gap-2">
                Attack Simulation Console
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest bg-royal/20 text-royal border border-royal/30">
                  Live VPC
                </span>
              </h1>
              <p className="text-xs text-mutedslate mt-0.5">
                Generate authentic adversary traffic from Attacker VM targeting Victim VM to evaluate real-time ML detection & multi-agent SOC response.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-end md:self-auto">
          <button
            onClick={() => {
              setStatusRefreshing(true);
              fetchAll();
            }}
            disabled={statusRefreshing}
            className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-softwhite border border-navy-600 text-xs font-medium transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${statusRefreshing ? 'animate-spin text-gold' : ''}`} />
            <span>Verify Infrastructure</span>
          </button>
        </div>
      </div>

      {/* VM Topology & Dynamic Connectivity Card */}
      <div className="bg-navy-900/90 border border-navy-700/80 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-navy-700/60 pb-3">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-softwhite tracking-wider uppercase">
              Infrastructure & Private VPC Routing Status
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-mutedslate">Safety Allowlist:</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-navy-950 text-gold border border-navy-700">
              {(status?.allowed_targets || ['10.0.0.14']).join(', ')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
          {/* Attacker VM Card */}
          <div className="p-4 rounded-xl bg-navy-950/80 border border-navy-700/90 hover:border-crimson/50 transition relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-crimson/20 border border-crimson/40 flex items-center justify-center text-crimson">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-softwhite">Attacker VM (Traffic Origin)</div>
                  <div className="text-[10px] font-mono text-mutedslate">Ubuntu 24.04 LTS</div>
                </div>
              </div>
              {status?.attacker_vm?.is_reachable ? (
                <span className="flex items-center text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> ONLINE
                </span>
              ) : (
                <span className="flex items-center text-[10px] font-mono text-crimson bg-crimson/20 px-2 py-0.5 rounded-full border border-crimson/30">
                  <WifiOff className="w-3 h-3 mr-1" /> UNREACHABLE
                </span>
              )}
            </div>

            <div className="mt-3 space-y-1 text-[11px] font-mono text-mutedslate border-t border-navy-800/80 pt-2.5">
              <div className="flex justify-between">
                <span>Public IP:</span>
                <span className="text-softwhite">{status?.attacker_vm?.host || '45.74.156.31'}</span>
              </div>
              <div className="flex justify-between">
                <span>Private IP (eth0):</span>
                <span className="text-softwhite font-bold">{status?.attacker_vm?.private_ip || '10.0.0.13'}</span>
              </div>
              <div className="flex justify-between">
                <span>SSH Port / Latency:</span>
                <span className="text-softwhite">Port 22 ({status?.attacker_vm?.latency_ms ? `${status.attacker_vm.latency_ms}ms` : '4ms'})</span>
              </div>
            </div>

            {/* Tools installed chips */}
            <div className="mt-3 pt-2.5 border-t border-navy-800/80 flex flex-wrap gap-1.5">
              {Object.entries(status?.tools_installed || { nmap: true, curl: true, python3: true, nc: true }).map(([tool, ready]) => (
                <span
                  key={tool}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    ready ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30' : 'bg-crimson/20 text-crimson border-crimson/30'
                  }`}
                >
                  ✓ {tool}
                </span>
              ))}
            </div>
          </div>

          {/* VPC Private Interconnect Link */}
          <div className="flex flex-col items-center justify-center p-3 text-center">
            <div className="flex items-center space-x-2 text-xs font-mono text-softwhite">
              <span className="px-2 py-1 rounded bg-navy-800 border border-navy-700">10.0.0.0/16</span>
              <ArrowRight className="w-4 h-4 text-royal animate-pulse" />
              <span className="px-2 py-1 rounded bg-navy-800 border border-navy-700">Private Subnet</span>
            </div>
            <div className="mt-2 text-[11px] text-mutedslate">
              {status?.private_network_reachability ? (
                <span className="text-emerald-400 flex items-center justify-center gap-1 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Isolated Private Route Active (&lt;1ms)
                </span>
              ) : (
                <span className="text-gold flex items-center justify-center gap-1 font-mono">
                  <AlertTriangle className="w-3.5 h-3.5" /> Route verification pending
                </span>
              )}
            </div>
            <p className="text-[10px] text-mutedslate/70 mt-1 max-w-xs">
              Attacks originating from the Attacker VM strictly target the Victim VM's private IP (10.0.0.14) over the internal VPC.
            </p>
          </div>

          {/* Victim VM Card */}
          <div className="p-4 rounded-xl bg-navy-950/80 border border-navy-700/90 hover:border-royal/50 transition relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-royal/20 border border-royal/40 flex items-center justify-center text-royal">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-softwhite">Victim VM (Target Host)</div>
                  <div className="text-[10px] font-mono text-mutedslate">Ubuntu 24.04 LTS (Nginx + SSH)</div>
                </div>
              </div>
              {status?.victim_vm?.is_reachable ? (
                <span className="flex items-center text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> MONITORED
                </span>
              ) : (
                <span className="flex items-center text-[10px] font-mono text-crimson bg-crimson/20 px-2 py-0.5 rounded-full border border-crimson/30">
                  <WifiOff className="w-3 h-3 mr-1" /> UNREACHABLE
                </span>
              )}
            </div>

            <div className="mt-3 space-y-1 text-[11px] font-mono text-mutedslate border-t border-navy-800/80 pt-2.5">
              <div className="flex justify-between">
                <span>Public IP:</span>
                <span className="text-softwhite">{status?.victim_vm?.host || '45.74.156.69'}</span>
              </div>
              <div className="flex justify-between">
                <span>Private Target IP:</span>
                <span className="text-emerald-400 font-bold">{status?.victim_vm?.private_ip || '10.0.0.14'}</span>
              </div>
              <div className="flex justify-between">
                <span>Exposed Services:</span>
                <span className="text-softwhite">SSH (22), HTTP Nginx (80)</span>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-navy-800/80 flex items-center justify-between text-[10px] font-mono text-mutedslate">
              <span>Telemetry Source:</span>
              <span className="text-emerald-400">auth.log + nginx.access</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Terminal & Active Execution Banner */}
      <div className="bg-navy-900/90 border border-navy-700/80 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-gold" />
            <h2 className="text-sm font-bold text-softwhite uppercase tracking-wider">
              Real-Time Attack Execution & Detection Console
            </h2>
            {activeExecution && activeExecution.status === 'RUNNING' && (
              <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-crimson/20 text-crimson border border-crimson/40 text-[10px] font-mono animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-crimson" />
                <span>ATTACK IN PROGRESS</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {activeExecution && activeExecution.status === 'RUNNING' && (
              <button
                onClick={handleStopSimulation}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-crimson hover:bg-crimson/80 text-white font-medium text-xs shadow-lg shadow-crimson/20 transition"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Emergency Abort</span>
              </button>
            )}
            <button
              onClick={() => setLiveLogs([])}
              className="px-2.5 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-mutedslate hover:text-softwhite text-xs transition border border-navy-700"
            >
              Clear Logs
            </button>
          </div>
        </div>

        {/* 5-Stage SOC Pipeline Status Bar */}
        {activeExecution && (
          <div className="mb-4 grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-navy-950/70 border border-navy-800 rounded-xl">
            <div>
              <div className="text-[10px] text-mutedslate uppercase font-mono">1. Execution</div>
              <div className="mt-1">
                <StatusBadge status={activeExecution.status} />
              </div>
            </div>
            <div>
              <div className="text-[10px] text-mutedslate uppercase font-mono">2. Traffic Gen</div>
              <div className="mt-1">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  activeExecution.traffic_status === 'GENERATING' ? 'bg-orange-950 text-orange-400 border border-orange-500/30 animate-pulse' :
                  activeExecution.traffic_status === 'GENERATED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' :
                  'bg-navy-800 text-mutedslate'
                }`}>
                  {activeExecution.traffic_status}
                </span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-mutedslate uppercase font-mono">3. Flow Ingest</div>
              <div className="mt-1">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  activeExecution.flow_status === 'CAPTURED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' :
                  'bg-navy-800 text-mutedslate'
                }`}>
                  {activeExecution.flow_status} ({activeExecution.associated_event_ids?.length || 0})
                </span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-mutedslate uppercase font-mono">4. ML Detection</div>
              <div className="mt-1">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  activeExecution.ml_status === 'DETECTED' ? 'bg-crimson/20 text-crimson border border-crimson/40 font-bold' :
                  activeExecution.ml_status === 'INFERRED' ? 'bg-royal/20 text-royal border border-royal/30' :
                  'bg-navy-800 text-mutedslate'
                }`}>
                  {activeExecution.ml_status}
                </span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-mutedslate uppercase font-mono">5. SOC Alerts</div>
              <div className="mt-1 flex items-center space-x-1">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  activeExecution.soc_alert_status === 'INCIDENT_CREATED' ? 'bg-crimson/20 text-crimson border border-crimson/40' :
                  activeExecution.soc_alert_status === 'FINDINGS_RECORDED' ? 'bg-gold/20 text-gold border border-gold/40' :
                  'bg-navy-800 text-mutedslate'
                }`}>
                  {activeExecution.soc_alert_status}
                </span>
                {activeExecution.associated_incident_id && (
                  <Link
                    to={`/incidents/${activeExecution.associated_incident_id}`}
                    className="text-[10px] text-royal hover:underline flex items-center"
                    title="View Incident RCA"
                  >
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Live Terminal Output Box */}
        <div className="h-64 overflow-y-auto bg-navy-950 border border-navy-800 rounded-xl p-3 font-mono text-[11px] space-y-1 select-text">
          {liveLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-mutedslate">
              <Terminal className="w-8 h-8 mb-2 opacity-30" />
              <p>Simulation console idle. Select an attack category below and click Launch.</p>
            </div>
          ) : (
            liveLogs.map((log, index) => {
              const isSuccess = log.includes('[+]') || log.includes('COMPLETED') || log.includes('ONLINE');
              const isError = log.includes('[!]') || log.includes('FAILED') || log.includes('STOPPED');
              const isSystem = log.includes('[SYSTEM]') || log.includes('[*]');
              return (
                <div
                  key={index}
                  className={`leading-relaxed ${
                    isSuccess ? 'text-emerald-400' :
                    isError ? 'text-crimson font-medium' :
                    isSystem ? 'text-royal' :
                    'text-softwhite/90'
                  }`}
                >
                  {log}
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>

      {/* Attack Scenario Catalog Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-softwhite font-sans">
              Supported Adversary Attack Scenarios
            </h2>
            <p className="text-xs text-mutedslate">
              Select an attack technique to configure parameters and launch from the Attacker VM.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-navy-900 border border-navy-700/80 rounded-xl">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  activeCategory === cat
                    ? 'bg-royal text-softwhite shadow-sm'
                    : 'text-mutedslate hover:text-softwhite hover:bg-navy-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Scenario Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {filteredScenarios.map((sc) => (
            <div
              key={sc.scenario_id}
              className="bg-navy-900/90 border border-navy-700/80 rounded-2xl p-4 shadow-xl flex flex-col justify-between hover:border-royal/50 transition group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-950 text-gold border border-navy-800 uppercase tracking-wider">
                    {sc.category}
                  </span>
                  <SeverityBadge severity={sc.severity} />
                </div>

                <h3 className="text-sm font-bold text-softwhite group-hover:text-royal transition">
                  {sc.name}
                </h3>
                <p className="text-[11px] text-mutedslate mt-1.5 leading-relaxed line-clamp-3">
                  {sc.description}
                </p>

                <div className="mt-3 pt-2.5 border-t border-navy-800/80 text-[10px] font-mono text-mutedslate">
                  <span className="text-softwhite/80">{sc.mitre_technique}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-navy-800/80 flex items-center justify-between">
                <span className="text-[10px] font-mono text-mutedslate">
                  Target: <span className="text-softwhite">10.0.0.14</span>
                </span>
                <button
                  onClick={() => handleOpenLaunch(sc)}
                  disabled={activeExecution?.status === 'RUNNING'}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-royal hover:bg-royal/80 disabled:opacity-50 disabled:cursor-not-allowed text-softwhite text-xs font-semibold shadow-md shadow-royal/20 transition"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Launch</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Execution History Table */}
      <div className="bg-navy-900/90 border border-navy-700/80 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-navy-700/60 pb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-royal" />
            <h2 className="text-sm font-bold text-softwhite uppercase tracking-wider">
              Simulation Execution History & Real-Time Detection Linkage
            </h2>
          </div>
          <span className="text-xs text-mutedslate font-mono">
            {executions.length} runs recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-navy-700/80 text-mutedslate font-mono uppercase text-[10px]">
                <th className="py-2.5 px-3">Execution ID</th>
                <th className="py-2.5 px-3">Scenario</th>
                <th className="py-2.5 px-3">Target</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">ML & Alerts</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/80 font-mono">
              {executions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-mutedslate font-sans text-xs">
                    No simulation executions recorded yet. Launch an attack above to generate authentic telemetry!
                  </td>
                </tr>
              ) : (
                executions.map((ex) => (
                  <tr key={ex.execution_id} className="hover:bg-navy-800/50 transition">
                    <td className="py-3 px-3 font-bold text-softwhite">{ex.execution_id}</td>
                    <td className="py-3 px-3">
                      <div className="font-sans font-medium text-softwhite">{ex.scenario_name}</div>
                      <div className="text-[10px] text-mutedslate">{ex.scenario_category}</div>
                    </td>
                    <td className="py-3 px-3 text-gold">{ex.target_ip}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={ex.status} />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          ex.associated_finding_ids?.length > 0
                            ? 'bg-crimson/20 text-crimson border border-crimson/30 font-bold'
                            : 'bg-navy-800 text-mutedslate'
                        }`}>
                          {ex.associated_finding_ids?.length || 0} Findings
                        </span>
                        {ex.associated_incident_id && (
                          <Link
                            to={`/incidents/${ex.associated_incident_id}`}
                            className="px-2 py-0.5 rounded text-[10px] bg-royal/20 text-royal border border-royal/30 hover:underline flex items-center"
                          >
                            Incident <ExternalLink className="w-2.5 h-2.5 ml-1" />
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-mutedslate">
                      {ex.duration_seconds ? `${ex.duration_seconds}s` : '-'}
                    </td>
                    <td className="py-3 px-3 text-mutedslate text-[11px]">
                      {formatSocTimestamp(ex.created_at)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setInspectExecution(ex)}
                        className="px-2.5 py-1 rounded-lg bg-navy-800 hover:bg-navy-700 text-softwhite border border-navy-700 text-xs transition"
                      >
                        Logs
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Configure & Launch Attack */}
      {selectedScenario && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedScenario(null)}
          title={`Configure & Launch: ${selectedScenario.name}`}
        >
          <div className="space-y-4">
            <div className="p-3 bg-navy-950 border border-navy-800 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between font-mono">
                <span className="text-mutedslate">Technique:</span>
                <span className="text-softwhite font-bold">{selectedScenario.mitre_technique}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-mutedslate">Origin Host:</span>
                <span className="text-crimson font-bold">Attacker VM ({status?.attacker_vm?.host || '45.74.156.31'} / {status?.attacker_vm?.private_ip || '10.0.0.13'})</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-mutedslate">Private Target:</span>
                <span className="text-emerald-400 font-bold">{targetIp}</span>
              </div>
            </div>

            {/* Target IP Input (Strictly allowlisted) */}
            <div>
              <label className="block text-xs font-semibold text-mutedslate mb-1">
                Target Private IP (VPC Restricted)
              </label>
              <select
                value={targetIp}
                onChange={(e) => setTargetIp(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-softwhite font-mono focus:outline-none focus:border-royal"
              >
                {(status?.allowed_targets || ['10.0.0.14']).map((t) => (
                  <option key={t} value={t}>
                    {t} (Victim VM eth0)
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Config Parameters */}
            {Object.entries(selectedScenario.parameter_schema).map(([key, schema]: [string, any]) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <label className="font-semibold text-mutedslate capitalize">{key.replace('_', ' ')}</label>
                  <span className="text-[10px] text-mutedslate font-mono">{schema.description}</span>
                </div>
                <input
                  type={schema.type === 'integer' ? 'number' : 'text'}
                  value={configParams[key] ?? schema.default}
                  min={schema.min}
                  max={schema.max}
                  onChange={(e) => {
                    const val = schema.type === 'integer' ? parseInt(e.target.value, 10) : e.target.value;
                    setConfigParams({ ...configParams, [key]: val });
                  }}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-softwhite font-mono focus:outline-none focus:border-royal"
                />
              </div>
            ))}

            {launchError && (
              <div className="p-3 rounded-xl bg-crimson/20 border border-crimson/40 text-crimson text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{launchError}</span>
              </div>
            )}

            <div className="p-3 bg-gold/10 border border-gold/30 rounded-xl text-[11px] text-gold/90 leading-relaxed">
              ⚠️ <strong>Safety Guardrails Active:</strong> Traffic is strictly rate-limited and routed over the private VPC network. Destructive payloads and arbitrary commands are strictly blocked.
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-navy-800">
              <button
                type="button"
                onClick={() => setSelectedScenario(null)}
                className="px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-mutedslate text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLaunch}
                disabled={launching}
                className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-crimson hover:bg-crimson/80 text-white text-xs font-bold shadow-lg shadow-crimson/20 transition disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{launching ? 'Dispatching to VM...' : 'Confirm & Launch Simulation'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: View Full Execution Logs */}
      {inspectExecution && (
        <Modal
          isOpen={true}
          onClose={() => setInspectExecution(null)}
          title={`Execution Logs: ${inspectExecution.scenario_name} (${inspectExecution.execution_id})`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono p-3 bg-navy-950 rounded-xl border border-navy-800">
              <div>
                <span className="text-mutedslate block text-[10px]">Status:</span>
                <StatusBadge status={inspectExecution.status} />
              </div>
              <div>
                <span className="text-mutedslate block text-[10px]">Target:</span>
                <span className="text-gold font-bold">{inspectExecution.target_ip}</span>
              </div>
              <div>
                <span className="text-mutedslate block text-[10px]">Duration:</span>
                <span className="text-softwhite">{inspectExecution.duration_seconds || 0}s</span>
              </div>
              <div>
                <span className="text-mutedslate block text-[10px]">Exit Code:</span>
                <span className="text-softwhite">{inspectExecution.exit_code ?? '-'}</span>
              </div>
            </div>

            <div className="h-80 overflow-y-auto bg-navy-950 border border-navy-800 rounded-xl p-3 font-mono text-[11px] space-y-1 select-text">
              {(inspectExecution.raw_logs || 'No output recorded.').split('\n').map((line, idx) => (
                <div key={idx} className="text-softwhite/90 leading-relaxed">
                  {line}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inspectExecution.raw_logs || '');
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-softwhite text-xs transition border border-navy-700"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Logs</span>
              </button>
              <button
                onClick={() => setInspectExecution(null)}
                className="px-4 py-1.5 rounded-lg bg-royal hover:bg-royal/80 text-white text-xs font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
