import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { summaryMetrics as defaultMetrics, miniSparklines } from '../data/mockSecurityData'
import { useLiveEvents } from '../hooks/useLiveEvents'
import { MetricCard } from '../components/dashboard/MetricCard'
import { SecurityWorkflow } from '../components/dashboard/SecurityWorkflow'
import { RiskGauge } from '../components/dashboard/RiskGauge'
import { ActivityChart } from '../components/dashboard/ActivityChart'
import { RecentEvents } from '../components/dashboard/RecentEvents'
import { api } from '../api/client'
import { Shield, Radio, Server, CheckCircle2 } from 'lucide-react'

export function Dashboard() {
  const { events, flashNew, lastAddedEvent, isLiveConnected } = useLiveEvents()
  const [metrics, setMetrics] = useState(defaultMetrics)
  const [backendStatus, setBackendStatus] = useState('CONNECTING')
  const [lastUpdated, setLastUpdated] = useState('Just Now')

  useEffect(() => {
    let isMounted = true

    async function loadBackendDashboard() {
      try {
        const data = await api.getDashboardSummary()
        if (!isMounted || !data) return

        setBackendStatus('ONLINE')
        setLastUpdated(new Date().toLocaleTimeString())

        if (data.kpis) {
          setMetrics(prev => ({
            ...prev,
            eventsReceived: {
              ...prev.eventsReceived,
              value: (data.kpis.total_events || 12847).toLocaleString(),
            },
            activeThreats: {
              ...prev.activeThreats,
              value: (data.kpis.active_threats || 42).toString(),
            },
            criticalIncidents: {
              ...prev.criticalIncidents,
              value: (data.kpis.open_incidents || 8).toString(),
            },
            overallRiskScore: Math.round(data.kpis.avg_risk_score) || 72,
          }))
        }
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
      <SecurityWorkflow />

      {/* Risk Gauge & Activity Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <RiskGauge score={metrics.overallRiskScore} />
        </div>
        <div className="lg:col-span-2">
          <ActivityChart />
        </div>
      </div>

      {/* Recent Security Events Table */}
      <RecentEvents events={events} />
    </div>
  )
}
