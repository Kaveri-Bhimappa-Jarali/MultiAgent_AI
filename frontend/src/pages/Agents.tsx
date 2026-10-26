import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  FileCode,
  Shield,
  Activity
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

export const Agents: React.FC = () => {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [runs, setRuns] = useState<AgentExecution[]>([]);
  const [findings, setFindings] = useState<AgentFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAll, setRunningAll] = useState(false);
  const [selectedRun, setSelectedRun] = useState<AgentExecution | null>(null);
  const { subscribe } = useWebSocket();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [a, r, f] = await Promise.all([
        api.getAgentsStatus(),
        api.getAgentRuns(20),
        api.getAgentFindings(30),
      ]);
      setAgents(a);
      setRuns(r);
      setFindings(f);
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
      await api.runAgentPipeline({ agent_name: agentName });
      await fetchData();
    } catch (err) {
      console.error(`Failed to run agent ${agentName}`, err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-navy-700/80 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-softwhite flex items-center space-x-2">
            <span>MULTI-AGENT AI SOC ENGINE MONITOR</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-royal/20 text-royal-200 border border-royal/30 font-mono">
              10 SPECIALIZED AGENTS
            </span>
          </h1>
          <p className="text-xs text-mutedslate mt-1 font-mono">
            Orchestration, telemetry execution and cooperative reasoning state across all autonomous security agents.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRunAll}
            disabled={runningAll}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-royal to-purple-700 hover:from-royal-600 text-softwhite font-medium text-xs font-mono transition shadow-lg shadow-royal/25 disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${runningAll ? 'animate-spin' : ''}`} />
            <span>{runningAll ? 'Executing 10-Agent Pipeline...' : 'Run All 10 Agents Now'}</span>
          </button>
        </div>
      </div>

      {/* 10 Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.name}
            className="p-4 rounded-2xl bg-navy-800 border border-slate-800 hover:border-royal/50 transition flex flex-col justify-between shadow-xl"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-royal/20 border border-royal/40 flex items-center justify-center text-royal-200">
                  <Bot className="w-4 h-4" />
                </div>
                <StatusBadge status={agent.status} />
              </div>

              <h3 className="text-xs font-bold text-softwhite leading-snug">{agent.name}</h3>
              <p className="text-[11px] text-mutedslate mt-1.5 line-clamp-3 leading-relaxed font-sans">
                {agent.role_description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-navy-700/60 font-mono text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-mutedslate text-[10px]">Findings:</span>
                <span className="text-gold font-bold">{agent.total_findings}</span>
              </div>
              <button
                onClick={() => handleRunSingleAgent(agent.name)}
                className="w-full py-1.5 rounded-lg bg-navy-900 border border-slate-700 hover:border-royal text-[11px] text-royal-200 hover:text-softwhite transition flex items-center justify-center space-x-1"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Run Agent</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Execution Runs & Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Runs History */}
        <div className="p-5 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-softwhite flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gold" />
              <span>Execution Runs Telemetry</span>
            </h3>
            <span className="text-xs text-mutedslate font-mono">Recent 20 runs</span>
          </div>

          <div className="space-y-2 font-mono text-xs max-h-96 overflow-y-auto pr-1">
            {runs.length === 0 ? (
              <p className="text-mutedslate text-center py-8">No agent execution runs recorded yet.</p>
            ) : (
              runs.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedRun(r)}
                  className="p-3 rounded-xl bg-navy-900 border border-slate-800 hover:border-royal/50 transition cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-softwhite">{r.agent_name}</span>
                      <span className="text-[10px] text-mutedslate">({r.run_id})</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(r.start_time).toLocaleTimeString()} • Duration: {r.duration_ms}ms • Findings: {r.findings_count}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Agent Findings */}
        <div className="p-5 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-softwhite flex items-center space-x-2">
              <Shield className="w-4 h-4 text-soccritical" />
              <span>Autonomous Agent Findings</span>
            </h3>
            <span className="text-xs text-mutedslate font-mono">{findings.length} registered</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs max-h-96 overflow-y-auto pr-1">
            {findings.length === 0 ? (
              <p className="text-mutedslate text-center py-8">No agent findings generated yet.</p>
            ) : (
              findings.map((f) => (
                <div
                  key={f.finding_id}
                  className="p-3.5 rounded-xl bg-navy-900 border border-slate-800 hover:border-slate-700 transition space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <SeverityBadge severity={f.severity} size="sm" />
                      <span className="font-semibold text-softwhite truncate max-w-xs">{f.title}</span>
                    </div>
                    <span className="text-gold text-[11px] font-bold">
                      {Math.round(f.confidence * 100)}% Conf
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] line-clamp-2">{f.description}</p>
                  <div className="text-[10px] text-royal-300 font-semibold">
                    Agent: {f.agent_name}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Execution Log Details Modal */}
      <Modal
        isOpen={!!selectedRun}
        onClose={() => setSelectedRun(null)}
        title={`Execution Run Details: ${selectedRun?.agent_name} (${selectedRun?.run_id})`}
        maxWidth="xl"
      >
        {selectedRun && (
          <div className="space-y-4 font-mono text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-navy-900 border border-slate-800">
              <div>
                <span className="text-mutedslate">Status:</span>
                <div className="mt-1"><StatusBadge status={selectedRun.status} /></div>
              </div>
              <div>
                <span className="text-mutedslate">Duration:</span>
                <p className="text-softwhite font-bold mt-1">{selectedRun.duration_ms} ms</p>
              </div>
            </div>

            <div>
              <h4 className="text-softwhite font-semibold mb-1 flex items-center space-x-1.5">
                <FileCode className="w-3.5 h-3.5 text-gold" />
                <span>Execution Trace Logs</span>
              </h4>
              <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 space-y-1 max-h-60 overflow-y-auto text-[11px]">
                {selectedRun.execution_log && selectedRun.execution_log.map((log: any, idx: number) => (
                  <div key={idx} className="text-slate-300">
                    <span className="text-slate-500">[{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'UTC'}]</span>{' '}
                    <span className={log.level === 'ERROR' ? 'text-soccritical' : 'text-royal-300'}>
                      [{log.level}]
                    </span>{' '}
                    {log.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
