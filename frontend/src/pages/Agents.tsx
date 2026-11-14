import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { api } from '../api/client';
import { AgentStatus, AgentExecution, AgentFinding } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { Modal } from '../components/common/Modal';
import {
  Bot,
  Play,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Shield,
  Activity,
  GitMerge,
  Network,
  Lock,
  Terminal,
  Cpu,
  Crosshair,
  Zap,
  Sliders,
  Eye,
  Layers,
  Flame,
  HelpCircle,
  Copy,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { formatSocTimestamp } from '../utils/timestamps.js';

// Metadata for the canonical 10 autonomous SOC agents
const AGENT_METADATA: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; badge: string; order: number }> = {
  'Authentication Agent': { icon: Lock, color: 'text-amber-400 bg-amber-400/10 border-amber-400/30', badge: 'Tier-1 Ingest', order: 1 },
  'Network Monitoring Agent': { icon: Network, color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30', badge: 'Tier-1 NetFlow', order: 2 },
  'Endpoint Agent': { icon: Terminal, color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', badge: 'Tier-1 EDR', order: 3 },
  'Malicious Behaviour Agent': { icon: Flame, color: 'text-rose-400 bg-rose-400/10 border-rose-400/30', badge: 'Heuristic', order: 4 },
  'Anomaly Detection Agent': { icon: Cpu, color: 'text-purple-400 bg-purple-400/10 border-purple-400/30', badge: 'ML Unsupervised', order: 5 },
  'Threat Intelligence Agent': { icon: Crosshair, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30', badge: 'CTI Enrichment', order: 6 },
  'Correlation Agent': { icon: GitMerge, color: 'text-fuchsia-400 bg-fuchsia-400/10 border-fuchsia-400/40 shadow-[0_0_15px_rgba(217,70,239,0.25)]', badge: 'Incident Synthesis', order: 7 },
  'Attack Path Agent': { icon: Layers, color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/30', badge: 'Topology Graph', order: 8 },
  'Investigation Agent': { icon: Eye, color: 'text-teal-400 bg-teal-400/10 border-teal-400/30', badge: '8-Question RCA', order: 9 },
  'Response Agent': { icon: Zap, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', badge: 'SOAR Containment', order: 10 },
};

export const Agents: React.FC = () => {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [runs, setRuns] = useState<AgentExecution[]>([]);
  const [findings, setFindings] = useState<AgentFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAll, setRunningAll] = useState(false);
  const [runningSingle, setRunningSingle] = useState<string | null>(null);
  const [selectedAgentName, setSelectedAgentName] = useState<string>('Correlation Agent');
  const [activeTab, setActiveTab] = useState<'segregated' | 'grid'>('segregated');
  const [selectedRun, setSelectedRun] = useState<AgentExecution | null>(null);
  const [copiedLog, setCopiedLog] = useState(false);
  const { subscribe } = useWebSocket();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [a, r, f] = await Promise.all([
        api.getAgentsStatus(),
        api.getAgentRuns(60),
        api.getAgentFindings(80),
      ]);
      setAgents(a);
      setRuns(r);
      setFindings(f);

      // If selected agent is not set yet, pick Correlation Agent or first
      if (a.length > 0 && !selectedAgentName) {
        const corr = a.find(x => x.name === 'Correlation Agent');
        setSelectedAgentName(corr ? corr.name : a[0].name);
      }
    } catch (err) {
      console.error('Failed to load agents status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time agent status updates via WebSocket
  useEffect(() => {
    const unsub = subscribe('AGENT_STATUS_CHANGED', (update: any) => {
      setAgents((prev) =>
        prev.map((ag) => {
          if (ag.name === update.name) {
            return {
              ...ag,
              status: update.status,
              last_run_time: new Date().toISOString(),
              total_findings: update.findings_count !== undefined ? ag.total_findings + update.findings_count : ag.total_findings
            };
          }
          return ag;
        })
      );
    });
    return () => unsub();
  }, [subscribe]);

  const handleRunAll = async () => {
    try {
      setRunningAll(true);
      await api.runAgentPipeline({});
      await fetchData();
    } catch (err) {
      console.error('Failed to run pipeline', err);
    } finally {
      setRunningAll(false);
    }
  };

  const handleRunSingleAgent = async (agentName: string) => {
    try {
      setRunningSingle(agentName);
      await api.runAgentPipeline({ agent_name: agentName });
      await fetchData();
    } catch (err) {
      console.error(`Failed to run agent ${agentName}`, err);
    } finally {
      setRunningSingle(null);
    }
  };

  // Find currently selected agent data
  const currentAgent = useMemo(() => {
    return agents.find(a => a.name === selectedAgentName) || agents[0];
  }, [agents, selectedAgentName]);

  // Segregated runs for the active agent
  const agentRuns = useMemo(() => {
    return runs.filter(r => r.agent_name === selectedAgentName);
  }, [runs, selectedAgentName]);

  // Segregated findings for the active agent
  const agentFindings = useMemo(() => {
    return findings.filter(f => f.agent_name === selectedAgentName);
  }, [findings, selectedAgentName]);

  // Latest run for active agent
  const latestRun = agentRuns[0] || null;

  // Correlation Agent specific analysis extraction
  const correlationData = useMemo(() => {
    if (selectedAgentName !== 'Correlation Agent') return null;
    const corrFinding = agentFindings[0];
    if (!corrFinding || !corrFinding.evidence) {
      return {
        why: 'Continuously clusters incoming event telemetry by adversary IP, identity username, and host to identify multi-stage attack progressions.',
        when: {
          timestamp_str: 'Live Real-time Window (Dynamic Δt ≤ 180s)',
          duration_seconds: 180.0
        },
        how: 'Entity-pivot graph correlation with sliding-window threshold heuristics clustering Authentication and Network anomalies.',
        contributing_agents: ['Authentication Agent', 'Network Monitoring Agent', 'Anomaly Detection Agent', 'Threat Intelligence Agent']
      };
    }
    const ev = corrFinding.evidence;
    return {
      why: ev.why || corrFinding.description || 'Aggregates heterogeneous agent observations into unified incidents.',
      when: ev.when || { timestamp_str: 'Dynamic window', duration_seconds: 120.0 },
      how: ev.how || 'Cross-domain pivot clustering combining spatial and temporal entity markers.',
      contributing_agents: ev.contributing_agents || ['Authentication Agent', 'Network Monitoring Agent']
    };
  }, [selectedAgentName, agentFindings]);

  const copyExecutionLogs = (logs: any[]) => {
    const text = logs.map(l => `[${l.timestamp}] [${l.level}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Autonomous Multi-Agent SOC Engine"
        badge="10 Segregated Agent Windows"
        badgeVariant="royal"
        description="Segregated telemetry processing, trace logs, and transparent explainability across all 10 autonomous cybersecurity agents."
        actions={
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveTab(activeTab === 'segregated' ? 'grid' : 'segregated')}
              className="px-3.5 py-2 rounded-xl bg-navy-800 border border-slate-700 text-mutedslate hover:text-softwhite text-xs font-mono transition flex items-center space-x-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{activeTab === 'segregated' ? 'Grid View' : 'Segregated Windows'}</span>
            </button>

            <button
              onClick={handleRunAll}
              disabled={runningAll}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-royal to-purple-700 hover:from-royal-600 text-softwhite font-medium text-xs font-mono transition shadow-lg shadow-royal/25 disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${runningAll ? 'animate-spin' : ''}`} />
              <span>{runningAll ? 'Executing 10-Agent Pipeline...' : 'Run All 10 Agents'}</span>
            </button>
          </div>
        }
      />

      {/* 10-Agent Segregated Window Selector Dock */}
      <div className="p-2.5 rounded-2xl bg-navy-900/90 border border-navy-700/80 shadow-2xl backdrop-blur-md overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2 min-w-max">
          {agents.map((ag) => {
            const meta = AGENT_METADATA[ag.name] || {
              icon: Bot,
              color: 'text-royal bg-royal/10 border-royal/30',
              badge: 'Agent',
              order: 99
            };
            const Icon = meta.icon;
            const isSelected = selectedAgentName === ag.name;
            const isRunning = ag.status === 'RUNNING';

            return (
              <button
                key={ag.name}
                onClick={() => {
                  setSelectedAgentName(ag.name);
                  setActiveTab('segregated');
                }}
                className={`relative flex items-center space-x-2.5 px-3.5 py-2 rounded-xl text-xs font-mono transition-all duration-200 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-royal/30 to-purple-900/40 border-royal text-softwhite shadow-[0_0_16px_rgba(99,102,241,0.3)]'
                    : 'bg-navy-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className={`p-1.5 rounded-lg border ${meta.color} flex-shrink-0`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <div className="font-bold flex items-center space-x-1.5">
                    <span className="truncate">{ag.name.replace(' Agent', '')}</span>
                    {isRunning && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
                  </div>
                  <div className="text-[10px] text-mutedslate">
                    {ag.total_findings} findings
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'segregated' ? (
        /* SEGREGATED AGENT WINDOW */
        <div className="space-y-6">
          {currentAgent && (
            <div className="p-6 rounded-2xl bg-navy-800/90 border border-slate-700/80 shadow-2xl backdrop-blur-md space-y-6">
              {/* Agent Window Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-navy-700/80">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-royal/30 to-purple-800/40 border border-royal/40 flex items-center justify-center text-royal-200 shadow-lg shadow-royal/20">
                    {(() => {
                      const Icon = AGENT_METADATA[currentAgent.name]?.icon || Bot;
                      return <Icon className="w-6 h-6 text-royal-200" />;
                    })()}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <h2 className="text-xl font-bold text-softwhite tracking-tight">{currentAgent.name}</h2>
                      <StatusBadge status={currentAgent.status} />
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">
                        {AGENT_METADATA[currentAgent.name]?.badge || 'Autonomous Agent'}
                      </span>
                    </div>
                    <p className="text-xs text-mutedslate mt-1 max-w-2xl leading-relaxed">
                      {currentAgent.role_description}
                    </p>
                  </div>
                </div>

                {/* Right Quick Controls */}
                <div className="flex items-center space-x-3 flex-shrink-0">
                  <div className="text-right font-mono text-[11px] text-slate-400 hidden sm:block">
                    <div>Last Executed: <span className="text-softwhite">{currentAgent.last_run_time ? formatSocTimestamp(currentAgent.last_run_time) : 'Never'}</span></div>
                    <div>Total Findings: <span className="text-gold font-bold">{currentAgent.total_findings}</span></div>
                  </div>

                  <button
                    onClick={() => handleRunSingleAgent(currentAgent.name)}
                    disabled={runningSingle === currentAgent.name}
                    className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-navy-900 border border-slate-700 hover:border-royal text-xs font-mono text-softwhite transition disabled:opacity-50"
                  >
                    <Play className={`w-3.5 h-3.5 fill-current text-royal-300 ${runningSingle === currentAgent.name ? 'animate-spin' : ''}`} />
                    <span>{runningSingle === currentAgent.name ? 'Running...' : 'Run This Agent'}</span>
                  </button>
                </div>
              </div>

              {/* SPECIAL CORRELATION EXPLAINABILITY WINDOW (Why, When, How) */}
              {selectedAgentName === 'Correlation Agent' && correlationData && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-fuchsia-950/20 via-navy-900 to-purple-950/20 border border-fuchsia-500/40 shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-fuchsia-500/20">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-softwhite tracking-wide uppercase font-mono">
                        Correlation Agent: Cross-Agent Reasoning & Explainability Matrix
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 text-[10px] font-mono text-fuchsia-300 font-bold">
                      Automated Synthesis
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                    {/* WHY */}
                    <div className="p-3.5 rounded-xl bg-navy-950/80 border border-slate-800 space-y-1.5">
                      <div className="flex items-center space-x-1.5 text-rose-400 font-bold uppercase tracking-wider text-[11px]">
                        <Flame className="w-3.5 h-3.5" />
                        <span>1. WHY CORRELATED</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {correlationData.why}
                      </p>
                    </div>

                    {/* WHEN */}
                    <div className="p-3.5 rounded-xl bg-navy-950/80 border border-slate-800 space-y-1.5">
                      <div className="flex items-center space-x-1.5 text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>2. WHEN CORRELATED (TIMESTAMP)</span>
                      </div>
                      <div className="text-[11px] text-softwhite font-semibold">
                        {correlationData.when.timestamp_str}
                      </div>
                      <div className="text-[10px] text-mutedslate">
                        Observation Window: <span className="text-cyan-300 font-bold">{correlationData.when.duration_seconds}s</span> duration
                      </div>
                    </div>

                    {/* HOW */}
                    <div className="p-3.5 rounded-xl bg-navy-950/80 border border-slate-800 space-y-1.5">
                      <div className="flex items-center space-x-1.5 text-fuchsia-400 font-bold uppercase tracking-wider text-[11px]">
                        <GitMerge className="w-3.5 h-3.5" />
                        <span>3. HOW CORRELATED (METHOD)</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {correlationData.how}
                      </p>
                    </div>
                  </div>

                  {/* Contributing Agents Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 text-xs font-mono">
                    <span className="text-mutedslate text-[11px]">Contributing Agent Disciplines:</span>
                    {correlationData.contributing_agents.map((agName: string) => (
                      <span
                        key={agName}
                        onClick={() => setSelectedAgentName(agName)}
                        className="cursor-pointer px-2.5 py-1 rounded-lg bg-navy-950 border border-fuchsia-500/30 hover:border-fuchsia-400 text-fuchsia-300 text-[11px] font-semibold transition flex items-center space-x-1"
                      >
                        <span>{agName}</span>
                        <ChevronRight className="w-3 h-3 text-fuchsia-400" />
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* SEGREGATED TWO-COLUMN WINDOW (Trace Logs vs Findings) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Panel 1: Execution Trace Terminal */}
                <div className="rounded-2xl bg-navy-950 border border-slate-800 p-4 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                      <div className="flex items-center space-x-2">
                        <Terminal className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-xs font-bold text-softwhite font-mono uppercase tracking-wider">
                          Segregated Execution Stream
                        </h3>
                        {latestRun && (
                          <span className="text-[10px] text-mutedslate font-mono">
                            ({latestRun.run_id})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {latestRun?.execution_log && (
                          <button
                            onClick={() => copyExecutionLogs(latestRun.execution_log)}
                            className="p-1 rounded text-mutedslate hover:text-softwhite text-xs flex items-center space-x-1"
                            title="Copy logs"
                          >
                            <Copy className="w-3 h-3" />
                            <span className="text-[10px]">{copiedLog ? 'Copied!' : 'Copy'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="font-mono text-[11px] space-y-1.5 max-h-96 overflow-y-auto pr-1">
                      {latestRun && latestRun.execution_log && latestRun.execution_log.length > 0 ? (
                        latestRun.execution_log.map((log: any, idx: number) => {
                          const isErr = log.level === 'ERROR';
                          const isWarn = log.level === 'WARNING';
                          return (
                            <div key={idx} className="flex items-start space-x-2 leading-relaxed">
                              <span className="text-slate-600 select-none">
                                [{log.timestamp ? formatSocTimestamp(log.timestamp) : 'LIVE'}]
                              </span>
                              <span className={isErr ? 'text-rose-400 font-bold' : (isWarn ? 'text-amber-400' : 'text-emerald-400')}>
                                [{log.level}]
                              </span>
                              <span className="text-slate-300 break-all">{log.message}</span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-slate-500 py-12 text-center">
                          <Terminal className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                          <p>No active execution trace logs for {currentAgent.name}.</p>
                          <p className="text-[10px] text-slate-600 mt-1">Click "Run This Agent" to execute pipeline telemetry.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {latestRun && (
                    <div className="pt-3 mt-3 border-t border-slate-800/80 font-mono text-[10px] text-mutedslate flex items-center justify-between">
                      <div>Execution Duration: <span className="text-softwhite font-bold">{latestRun.duration_ms}ms</span></div>
                      <div>Status: <span className="text-emerald-400 font-bold">{latestRun.status}</span></div>
                    </div>
                  )}
                </div>

                {/* Panel 2: Segregated Findings & Verdicts */}
                <div className="rounded-2xl bg-navy-950 border border-slate-800 p-4 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-royal-300" />
                        <h3 className="text-xs font-bold text-softwhite font-mono uppercase tracking-wider">
                          Segregated Output Findings ({agentFindings.length})
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono text-mutedslate">Filtered to {currentAgent.name}</span>
                    </div>

                    <div className="space-y-3 font-mono text-xs max-h-96 overflow-y-auto pr-1">
                      {agentFindings.length === 0 ? (
                        <div className="text-slate-500 py-12 text-center">
                          <Shield className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                          <p>No findings currently logged by {currentAgent.name}.</p>
                          <p className="text-[10px] text-slate-600 mt-1">Findings are registered when telemetry crosses threat thresholds.</p>
                        </div>
                      ) : (
                        agentFindings.map((f) => (
                          <div
                            key={f.finding_id}
                            className="p-3.5 rounded-xl bg-navy-900 border border-slate-800/80 hover:border-royal/50 transition space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <SeverityBadge severity={f.severity} size="sm" />
                                <span className="font-bold text-softwhite truncate max-w-[240px]">{f.title}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-royal/20 border border-royal/30 text-royal-300 text-[10px] font-bold">
                                {Math.round(f.confidence * 100)}% Conf
                              </span>
                            </div>

                            <p className="text-slate-300 text-[11px] leading-relaxed">
                              {f.description}
                            </p>

                            {/* Evidence payload snippet */}
                            {f.evidence && (
                              <div className="p-2 rounded bg-black/40 border border-slate-800 text-[10px] text-slate-400 space-y-1">
                                <div className="text-slate-500 font-semibold">Evidence Payload:</div>
                                {f.evidence.pivot_entity && (
                                  <div>Pivot Entity: <span className="text-softwhite font-bold">{f.evidence.pivot_entity}</span></div>
                                )}
                                {f.evidence.event_count && (
                                  <div>Correlated Events: <span className="text-cyan-300 font-bold">{f.evidence.event_count}</span></div>
                                )}
                                {f.evidence.actions && (
                                  <div>Dispatched Actions: <span className="text-amber-300 font-bold">{f.evidence.actions.join(', ')}</span></div>
                                )}
                              </div>
                            )}

                            {f.recommendations && f.recommendations.length > 0 && (
                              <div className="text-[10px] text-royal-200">
                                <span className="font-bold text-slate-400">Recommendation: </span>
                                {f.recommendations[0]}
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                              <span>ID: {f.finding_id}</span>
                              <span>{formatSocTimestamp(f.created_at)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-800/80 font-mono text-[10px] text-mutedslate flex items-center justify-between">
                    <div>Domain: <span className="text-softwhite">{AGENT_METADATA[currentAgent.name]?.badge || 'Autonomous'}</span></div>
                    <div>Registered Findings: <span className="text-gold font-bold">{agentFindings.length}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ALL AGENTS GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 font-mono">
          {agents.map((ag) => {
            const meta = AGENT_METADATA[ag.name] || {
              icon: Bot,
              color: 'text-royal bg-royal/10 border-royal/30',
              badge: 'Agent'
            };
            const Icon = meta.icon;
            const agLatestFindings = findings.filter(f => f.agent_name === ag.name);

            return (
              <div
                key={ag.name}
                onClick={() => {
                  setSelectedAgentName(ag.name);
                  setActiveTab('segregated');
                }}
                className="p-4 rounded-2xl bg-navy-800 border border-slate-800 hover:border-royal transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xl group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-xl border ${meta.color} flex items-center justify-center`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <StatusBadge status={ag.status} />
                  </div>

                  <h3 className="text-xs font-bold text-softwhite group-hover:text-royal-200 transition">
                    {ag.name}
                  </h3>
                  <p className="text-[10px] text-mutedslate mt-1 line-clamp-2">
                    {ag.role_description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-navy-700/60 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-mutedslate text-[10px]">Findings:</span>
                    <span className="text-gold font-bold">{ag.total_findings}</span>
                  </div>
                  <div className="w-full py-1.5 rounded-lg bg-navy-900 border border-slate-700 group-hover:border-royal text-[11px] text-royal-200 text-center transition">
                    Open Window →
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
