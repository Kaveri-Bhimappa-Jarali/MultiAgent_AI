import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { miniSparklines } from '../data/mockSecurityData'
import { useLiveEvents } from '../hooks/useLiveEvents'
import { MetricCard } from '../components/dashboard/MetricCard'
import { SecurityWorkflow } from '../components/dashboard/SecurityWorkflow'
import { RiskGauge } from '../components/dashboard/RiskGauge'
import { ActivityChart } from '../components/dashboard/ActivityChart'
import { RecentEvents } from '../components/dashboard/RecentEvents'
import { api } from '../api/client'
import { Shield, Radio, Server, CheckCircle2, Bot, Zap, Crosshair, Globe, ArrowRight, Sliders, Layers } from 'lucide-react'
import { MultiAgentPipeline } from '../components/pipeline/MultiAgentPipeline'

// Real-data defaults – shown while API is loading (no fake numbers)
const emptyMetrics = {
  eventsReceived:    { value: '—', label: 'Events Received',    sub: 'Loading…', trend: '',           color: '#8b5cf6' },
  correlatedEvents:  { value: '—', label: 'Correlated Events',  sub: 'Loading…', trend: '',           color: '#06b6d4' },
  activeThreats:     { value: '—', label: 'Active Threats',     sub: 'Loading…', trend: '',           color: '#f97316' },
  criticalIncidents: { value: '—', label: 'Critical Incidents', sub: 'Loading…', trend: '',           color: '#ef4444' },
  aiAnalyses:        { value: '—', label: 'AI Analyses',        sub: 'Loading…', trend: 'Agent Data', color: '#d946ef' },
  overallRiskScore: 0,
}

export function Dashboard() {
  const navigate = useNavigate()
  const { events, flashNew, lastAddedEvent, isLiveConnected } = useLiveEvents()
  const [metrics, setMetrics] = useState(emptyMetrics)
  const [workflowData, setWorkflowData] = useState(null)
  const [trends, setTrends] = useState([])
  const [backendStatus, setBackendStatus] = useState('CONNECTING')
  const [lastUpdated, setLastUpdated] = useState('Just Now')
  const [viewMode, setViewMode] = useState('pipeline')

  useEffect(() => {
    let isMounted = true

    async function loadBackendDashboard() {
      try {
        // Fetch dashboard summary + agent status (for total findings count) in parallel
        const [data, agentStatuses, allIncidents] = await Promise.all([
          api.getDashboardSummary(),
          api.getAgentsStatus().catch(() => []),
          api.getIncidents().catch(() => []),
        ])
        if (!isMounted || !data) return

        setBackendStatus('ONLINE')
        setLastUpdated(new Date().toLocaleTimeString())
        if (data.event_trends) setTrends(data.event_trends)

        const m = data.metrics || data.kpis || {}

        // Total agent findings = sum of each agent's total_findings from /api/agents/status
        const totalFindings = Array.isArray(agentStatuses)
          ? agentStatuses.reduce((sum, a) => sum + (a.total_findings || 0), 0)
          : 0

        // All incidents: total count
        const incidentList = Array.isArray(allIncidents) ? allIncidents : []
        const totalIncidents = incidentList.length

        // Correlated events = number of incidents (each incident = correlation cluster)
        const correlatedCount = totalIncidents

        // Active threats = open (non-contained) incidents
        const openCount = m.open_incidents ?? incidentList.filter(i => i.status !== 'CONTAINED').length

        // Critical incidents = HIGH or CRITICAL severity
        const critCount = m.critical_high_incidents ?? incidentList.filter(i => ['CRITICAL','HIGH'].includes(i.severity)).length

        // AI Analyses = findings from Investigation + Correlation agents
        const aiCount = Array.isArray(agentStatuses)
          ? agentStatuses
              .filter(a => ['Investigation Agent','Correlation Agent','Attack-Path Analysis Agent'].some(n => a.name?.includes(n.split(' ')[0])))
              .reduce((sum, a) => sum + (a.total_findings || 0), 0)
          : totalFindings

        const totalEvents = m.total_events ?? 0

        setMetrics({
          eventsReceived:    { value: totalEvents.toLocaleString(),  label: 'Events Received',    sub: 'Real-time security feed',          trend: '',                  color: '#8b5cf6' },
          correlatedEvents:  { value: correlatedCount.toString(),     label: 'Correlated Events',  sub: 'Correlation Engine Active',         trend: `${totalIncidents} Incidents`, color: '#06b6d4' },
          activeThreats:     { value: openCount.toString(),           label: 'Active Threats',     sub: `${critCount} High Risk`,           trend: '',                  color: '#f97316' },
          criticalIncidents: { value: critCount.toString(),           label: 'Critical Incidents', sub: 'Needs Immediate Attention',         trend: `${m.contained_threats ?? 0} Contained`, color: '#ef4444' },
          aiAnalyses:        { value: aiCount.toString(),             label: 'AI Analyses',        sub: 'Multi-Agent Pipeline',             trend: 'Live',              color: '#d946ef' },
          overallRiskScore: Math.round(m.avg_risk_score || (critCount > 0 ? 70 : 30)),
        })

        // Build workflow pipeline stages from real data
        setWorkflowData([
          { id: 'events',      label: 'Events Received',       icon: '📥', count: totalEvents.toLocaleString(),   status: 'Active Ingest',   desc: 'Normalized Syslog, WAF & EDR streams' },
          { id: 'correlation', label: 'Correlation Engine',    icon: '🔗', count: correlatedCount.toString(),      status: 'Correlating',     desc: 'Graph clustering & multi-event chains' },
          { id: 'llm',         label: 'LLM Analysis',          icon: '🧠', count: aiCount.toString(),              status: 'Reasoning',       desc: 'Observation synthesis & threat diagnosis' },
          { id: 'severity',    label: 'Severity Classification',icon: '⚠️', count: `${critCount} Critical`,        status: `Scored (${Math.round(m.avg_risk_score || 70)}/100)`, desc: 'Multi-factor risk & impact scoring' },
          { id: 'action',      label: 'Response Decision',     icon: '⚡', count: '4 Tiers',                       status: 'Automated / Human', desc: 'Allow • Monitor • Investigate • Block' },
        ])
      } catch (err) {
        if (isMounted) setBackendStatus('LOCAL_SIM')
      }
    }

    loadBackendDashboard()
    const interval = setInterval(loadBackendDashboard, 15000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="p-4 lg:p-8 space-y-7">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-white">
              Security Operations Center
            </h1>
            {flashNew && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono text-[11px] font-bold flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>+1 Live Event ({lastAddedEvent?.id})</span>
              </motion.span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Real-time Event Monitoring, Correlation and AI Threat Analysis
          </p>
        </div>

        {/* Right Status Indicator: Connected to FastAPI backend */}
        <div className="flex items-center gap-4 bg-[#0d121c] border border-[#1e2736] px-4 py-2 rounded-xl text-xs flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${backendStatus === 'ONLINE' ? 'bg-emerald-400' : 'bg-purple-400'} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${backendStatus === 'ONLINE' ? 'bg-emerald-500' : 'bg-purple-500'}`} />
            </span>
            <span className="font-bold text-white tracking-wider flex items-center gap-1">
              <span>{backendStatus === 'ONLINE' ? 'FASTAPI BACKEND ONLINE' : 'SYSTEM OPERATIONAL'}</span>
              <span className="text-[10px] text-emerald-400 font-mono">(PORT 8000)</span>
            </span>
          </div>
          <div className="w-px h-4 bg-[#1e2736]" />
          <div className="text-slate-400 font-mono text-[11px]">
            Sync: <span className="text-purple-300">{lastUpdated}</span>
          </div>
        </div>
      </div>

      {/* Primary Dashboard View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-[#0b0f17]/90 border border-purple-500/25 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('pipeline')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all duration-200 flex items-center gap-2 ${
              viewMode === 'pipeline'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10'
            }`}
          >
            <Bot className="w-4 h-4 text-purple-300" />
            <span>Multi-Agent Pipeline (4 Stages)</span>
          </button>

          <button
            onClick={() => setViewMode('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all duration-200 flex items-center gap-2 ${
              viewMode === 'overview'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10'
            }`}
          >
            <Shield className="w-4 h-4 text-purple-300" />
            <span>SOC Telemetry & Sparklines</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 px-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Realtime Telemetry Ingestion Active</span>
        </div>
      </div>

      {/* View Mode 1: 4-Stage Multi-Agent AI Pipeline */}
      {viewMode === 'pipeline' && (
        <MultiAgentPipeline />
      )}

      {/* View Mode 2: Classical SOC Telemetry Overview */}
      {viewMode === 'overview' && (
        <>
          {/* 5 Security Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard
              emoji="📥"
              title="Events Received"
              value={metrics.eventsReceived.value}
              subtitle={metrics.eventsReceived.sub}
              trend={metrics.eventsReceived.trend}
              color="#8b5cf6"
              chartData={miniSparklines.events}
            />
            <MetricCard
              emoji="🔗"
              title="Correlated Events"
              value={metrics.correlatedEvents.value}
              subtitle={metrics.correlatedEvents.sub}
              trend={metrics.correlatedEvents.trend}
              color="#06b6d4"
              chartData={miniSparklines.correlated}
            />
            <MetricCard
              emoji="🚨"
              title="Active Threats"
              value={metrics.activeThreats.value}
              subtitle={metrics.activeThreats.sub}
              trend={metrics.activeThreats.trend}
              color="#f97316"
              chartData={miniSparklines.threats}
            />
            <MetricCard
              emoji="🔴"
              title="Critical Incidents"
              value={metrics.criticalIncidents.value}
              subtitle={metrics.criticalIncidents.sub}
              trend={metrics.criticalIncidents.trend}
              color="#ef4444"
              chartData={miniSparklines.critical}
            />
            <MetricCard
              emoji="🧠"
              title="AI Analyses"
              value={metrics.aiAnalyses.value}
              subtitle={metrics.aiAnalyses.sub}
              trend={metrics.aiAnalyses.trend}
              color="#d946ef"
              chartData={miniSparklines.ai}
            />
          </div>

          {/* Main Security Workflow Pipeline */}
          <SecurityWorkflow stages={workflowData} />

          {/* Risk Gauge & Activity Chart Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <RiskGauge score={metrics.overallRiskScore} />
            </div>
            <div className="lg:col-span-2">
              <ActivityChart events={events} trends={trends} />
            </div>
          </div>

          {/* Recent Security Events Table */}
          <RecentEvents events={events} />

          {/* Advanced Modules Launchpad */}
          <div className="rounded-2xl p-6 bg-[#0d121c] border border-[#1e2736] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#182130]">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span>Advanced SOC Operational Modules</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Direct access to autonomous multi-agent pipelines, closed-loop SOAR containment, adversary emulation and threat intelligence
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                onClick={() => navigate('/agents')}
                className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736] hover:border-purple-500/50 hover:bg-[#111726] transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 rounded-lg bg-purple-950/40 text-purple-300 border border-purple-500/30">
                      <Bot className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-mono text-purple-300 font-bold px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/40">
                      10 Agents
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm group-hover:text-purple-300 transition-colors">Multi-Agent Intelligence</h3>
                  <p className="text-xs text-slate-400 mt-1">Autonomous Blackboard orchestrator and telemetry reasoning.</p>
                </div>
                <div className="mt-3 flex items-center text-xs font-mono text-purple-400 gap-1">
                  <span>Inspect Agents</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              <div
                onClick={() => navigate('/responses')}
                className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736] hover:border-yellow-500/50 hover:bg-[#111726] transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 rounded-lg bg-yellow-950/40 text-yellow-300 border border-yellow-500/30">
                      <Zap className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-mono text-yellow-300 font-bold px-1.5 py-0.5 rounded bg-yellow-950/60 border border-yellow-800/40">
                      7-State SOAR
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm group-hover:text-yellow-300 transition-colors">SOAR Containment</h3>
                  <p className="text-xs text-slate-400 mt-1">Gated firewall IP blocks, rollback controls, and telemetry verification.</p>
                </div>
                <div className="mt-3 flex items-center text-xs font-mono text-yellow-400 gap-1">
                  <span>Manage Responses</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              <div
                onClick={() => navigate('/simulation')}
                className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736] hover:border-rose-500/50 hover:bg-[#111726] transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-500/30">
                      <Crosshair className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-mono text-rose-300 font-bold px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800/40">
                      BAS Console
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm group-hover:text-rose-300 transition-colors">Adversary Simulation</h3>
                  <p className="text-xs text-slate-400 mt-1">Execute live adversary attack campaigns against virtual lab nodes.</p>
                </div>
                <div className="mt-3 flex items-center text-xs font-mono text-rose-400 gap-1">
                  <span>Launch Attacks</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              <div
                onClick={() => navigate('/intelligence')}
                className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736] hover:border-emerald-500/50 hover:bg-[#111726] transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
                      <Globe className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-mono text-emerald-300 font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40">
                      Live CTI
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">Threat Intelligence</h3>
                  <p className="text-xs text-slate-400 mt-1">Real-time indicator queries against AbuseIPDB and AlienVault OTX.</p>
                </div>
                <div className="mt-3 flex items-center text-xs font-mono text-emerald-400 gap-1">
                  <span>Lookup Indicators</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
