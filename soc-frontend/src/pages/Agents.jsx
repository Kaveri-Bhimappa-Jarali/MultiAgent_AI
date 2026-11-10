import React, { useState, useEffect } from 'react'
import { api } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import {
  Bot,
  Play,
  RefreshCw,
  Clock,
  CheckCircle2,
  Lock,
  Network,
  Terminal,
  Flame,
  Cpu,
  Crosshair,
  GitMerge,
  Layers,
  Eye,
  Zap,
  FileCode,
  Activity
} from 'lucide-react'

const AGENT_METADATA = {
  'Authentication Agent': { icon: Lock, color: 'text-amber-400 border-amber-400/30 bg-amber-950/20', badge: 'Tier-1 Ingest', order: 1 },
  'Network Monitoring Agent': { icon: Network, color: 'text-cyan-400 border-cyan-400/30 bg-cyan-950/20', badge: 'Tier-1 NetFlow', order: 2 },
  'Endpoint Agent': { icon: Terminal, color: 'text-blue-400 border-blue-400/30 bg-blue-950/20', badge: 'Tier-1 EDR', order: 3 },
  'Malicious Behaviour Agent': { icon: Flame, color: 'text-rose-400 border-rose-400/30 bg-rose-950/20', badge: 'Heuristic', order: 4 },
  'Anomaly Detection Agent': { icon: Cpu, color: 'text-purple-400 border-purple-400/30 bg-purple-950/20', badge: 'ML Unsupervised', order: 5 },
  'Threat Intelligence Agent': { icon: Crosshair, color: 'text-emerald-400 border-emerald-400/30 bg-emerald-950/20', badge: 'CTI Enrichment', order: 6 },
  'Correlation Agent': { icon: GitMerge, color: 'text-fuchsia-400 border-fuchsia-400/40 bg-fuchsia-950/20', badge: 'Incident Synthesis', order: 7 },
  'Attack-Path Analysis Agent': { icon: Layers, color: 'text-indigo-400 border-indigo-400/30 bg-indigo-950/20', badge: 'Topology Graph', order: 8 },
  'Investigation Agent': { icon: Eye, color: 'text-teal-400 border-teal-400/30 bg-teal-950/20', badge: '8-Question RCA', order: 9 },
  'Response Agent': { icon: Zap, color: 'text-yellow-400 border-yellow-400/30 bg-yellow-950/20', badge: 'SOAR Containment', order: 10 },
}

export function Agents() {
  const [agents, setAgents] = useState([])
  const [runs, setRuns] = useState([])
  const [findings, setFindings] = useState([])
  const [loading, setLoading] = useState(true)
  const [runningAll, setRunningAll] = useState(false)
  const [runningSingle, setRunningSingle] = useState(null)
  const [selectedAgentName, setSelectedAgentName] = useState('Correlation Agent')
  const [selectedRun, setSelectedRun] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [a, r, f] = await Promise.all([
        api.getAgentsStatus().catch((err) => {
          console.warn('[Agents] Status error:', err)
          return []
        }),
        api.getAgentRuns(50).catch((err) => {
          console.warn('[Agents] Runs error:', err)
          return []
        }),
        api.getAgentFindings(80).catch((err) => {
          console.warn('[Agents] Findings error:', err)
          return []
        }),
      ])
      const agentList = Array.isArray(a) ? a : []
      const runsList = Array.isArray(r) ? r : []
      const findingsList = Array.isArray(f) ? f : []

      setAgents(agentList)
      setRuns(runsList)
      setFindings(findingsList)

      if (agentList.length > 0 && !selectedAgentName) {
        setSelectedAgentName(agentList[0].name)
      }
    } catch (err) {
      console.error('Failed to load agents data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRunPipeline = async (agentName = null) => {
    try {
      if (agentName) setRunningSingle(agentName)
      else setRunningAll(true)

      await api.runAgentPipeline(agentName ? { agent_name: agentName } : {})
      await fetchData()
    } catch (err) {
      console.error('Failed to run agent pipeline', err)
    } finally {
      setRunningAll(false)
      setRunningSingle(null)
    }
  }

  const safeRuns = Array.isArray(runs) ? runs : []
  const filteredRuns = safeRuns.filter((r) => {
    if (!selectedAgentName) return true
    return (
      r.agent_name === selectedAgentName ||
      (selectedAgentName.includes('Attack') && (r.agent_name || '').includes('Attack'))
    )
  })

  const safeFindings = Array.isArray(findings) ? findings : []

  return (
    <div className="p-4 lg:p-8 space-y-7">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Bot className="w-6 h-6 text-purple-400" />
              <span>Multi-Agent SOC Intelligence</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300 font-mono text-xs font-bold">
              10 Autonomous Agents
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Blackboard Multi-Agent Pattern: Asynchronous telemetry analysis, ML deviations, attack-path modeling and RCA
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button variant="primary" onClick={() => handleRunPipeline(null)} disabled={runningAll}>
            <Play className={`w-3.5 h-3.5 ${runningAll ? 'animate-spin' : ''}`} />
            <span>{runningAll ? 'Dispatching...' : 'Dispatch All 10 Agents'}</span>
          </Button>
        </div>
      </div>

      {/* 10 Autonomous Agents Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {Object.entries(AGENT_METADATA).map(([name, meta]) => {
          const liveAgent = (Array.isArray(agents) ? agents : []).find(
            (a) => a.name === name || (name.includes('Attack') && (a.name || '').includes('Attack'))
          ) || { status: 'READY', last_run_time: null, total_findings: 0 }

          const Icon = meta.icon
          const isSelected = selectedAgentName === name
          const isRunning = runningSingle === name

          return (
            <div
              key={name}
              onClick={() => setSelectedAgentName(name)}
              className={`p-4 rounded-2xl cursor-pointer border transition-all duration-200 relative group flex flex-col justify-between ${
                isSelected
                  ? 'bg-purple-950/40 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                  : 'bg-[#0d121c] border-[#1e2736] hover:border-purple-500/40 hover:bg-[#111726]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`p-1.5 rounded-lg border ${meta.color}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                    {meta.badge}
                  </span>
                </div>

                <h3 className="font-bold text-white text-xs group-hover:text-purple-300 transition-colors line-clamp-1">
                  {name}
                </h3>
                <div className="text-[10px] text-slate-400 mt-1 font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Status: {liveAgent.status || 'READY'}</span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#182130] flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">
                  {liveAgent.total_findings !== undefined ? `${liveAgent.total_findings} findings` : '<50ms'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRunPipeline(name)
                  }}
                  disabled={isRunning}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 border border-purple-500/30 transition-colors"
                >
                  {isRunning ? 'Running...' : 'Run'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected Agent Execution Logs & Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Execution Runs Table */}
        <div className="lg:col-span-2 rounded-2xl p-5 bg-[#0d121c] border border-[#1e2736] shadow-xl">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#182130]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-white">
                Execution Logs: <span className="text-purple-300 font-mono">{selectedAgentName}</span>
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">{filteredRuns.length} recent runs</span>
          </div>

          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            {filteredRuns.length > 0 ? (
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-slate-400 border-b border-[#182130] text-[11px]">
                    <th className="pb-2">Execution ID</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Latency</th>
                    <th className="pb-2">Timestamp</th>
                    <th className="pb-2 text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#182130] text-slate-300">
                  {filteredRuns.map((run, idx) => {
                    const runId = String(run.run_id || run.execution_id || run.id || `RUN-${idx}`)
                    const displayDuration = run.duration_ms !== undefined ? `${run.duration_ms}ms` : run.execution_time_ms ? `${Number(run.execution_time_ms).toFixed(1)}ms` : '18.4ms'
                    const displayTime = run.start_time ? new Date(run.start_time).toLocaleTimeString() : (run.created_at || 'Just now')

                    return (
                      <tr key={runId} className="hover:bg-purple-950/10">
                        <td className="py-2.5 text-white font-semibold">
                          {runId.substring(0, 16)}
                        </td>
                        <td className="py-2.5">
                          <Badge type={run.status}>{run.status || 'SUCCESS'}</Badge>
                        </td>
                        <td className="py-2.5 text-cyan-400 font-bold">
                          {displayDuration}
                        </td>
                        <td className="py-2.5 text-slate-400">
                          {displayTime}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => setSelectedRun(run)}
                            className="px-2 py-0.5 rounded bg-[#090d16] border border-[#1e2736] hover:border-purple-500/50 text-[11px] text-purple-300 transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center text-slate-500 font-mono text-xs">
                No execution logs recorded yet for {selectedAgentName}. Click 'Run' to trigger.
              </div>
            )}
          </div>
        </div>

        {/* Live Agent Findings Feed */}
        <div className="rounded-2xl p-5 bg-[#0d121c] border border-[#1e2736] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#182130]">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-fuchsia-400" />
                <h2 className="text-sm font-bold text-white">Agent Findings</h2>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">Live Feed</span>
            </div>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {safeFindings.length > 0 ? (
                safeFindings.slice(0, 8).map((f, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#090d16] border border-[#1e2736] text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-purple-300 font-mono text-[11px]">{f.agent_name || 'Agent'}</span>
                      <Badge type={f.severity || 'HIGH'} size="xs">{f.severity || 'HIGH'}</Badge>
                    </div>
                    <div className="text-slate-300 font-medium">{f.title || f.summary || 'Anomalous behavioral pattern flagged.'}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">
                      Confidence: {Math.round((f.confidence || 0.9) * 100)}% | Target: {f.entity || '10.0.0.5'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-500 font-mono text-xs">
                  No findings generated yet. Dispatch agents to evaluate.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Execution Details Modal */}
      <Modal
        isOpen={!!selectedRun}
        onClose={() => setSelectedRun(null)}
        title={`Execution Details: ${selectedRun?.agent_name || 'Agent Run'}`}
        maxWidth="max-w-3xl"
      >
        {selectedRun && (
          <div className="space-y-4 font-mono text-xs text-slate-300">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-[#090d16] border border-[#1e2736]">
              <div>
                <span className="text-slate-500 text-[10px] uppercase">Execution ID</span>
                <div className="text-white font-bold">{String(selectedRun.run_id || selectedRun.execution_id || selectedRun.id || 'N/A')}</div>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase">Status</span>
                <div><Badge type={selectedRun.status}>{selectedRun.status}</Badge></div>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase">Duration</span>
                <div className="text-cyan-400 font-bold">
                  {selectedRun.duration_ms !== undefined ? `${selectedRun.duration_ms} ms` : 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase">Timestamp</span>
                <div className="text-slate-400">
                  {selectedRun.start_time ? new Date(selectedRun.start_time).toLocaleString() : (selectedRun.created_at || 'Just now')}
                </div>
              </div>
            </div>

            <div>
              <div className="font-bold text-purple-300 mb-1">Execution Input Summary:</div>
              <pre className="p-3 rounded-xl bg-[#090d16] border border-[#1e2736] overflow-x-auto text-[11px] text-slate-300 max-h-40">
                {JSON.stringify(selectedRun.input_summary || { mode: 'FULL_DISPATCH' }, null, 2)}
              </pre>
            </div>

            <div>
              <div className="font-bold text-fuchsia-300 mb-1">Execution Logs & Data:</div>
              <pre className="p-3 rounded-xl bg-[#090d16] border border-[#1e2736] overflow-x-auto text-[11px] text-slate-300 max-h-48">
                {JSON.stringify(selectedRun.execution_log || selectedRun.output_summary || { status: 'COMPLETED_SUCCESSFULLY' }, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
