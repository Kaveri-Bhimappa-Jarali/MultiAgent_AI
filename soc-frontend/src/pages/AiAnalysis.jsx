import React, { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { LLMAnalysis } from '../components/ai/LLMAnalysis'
import { SeverityCard } from '../components/ai/SeverityCard'
import { RecommendedActions } from '../components/ai/RecommendedActions'
import { api } from '../api/client'
import { mapBackendIncident } from '../api/incidentMapper'
import { BrainCircuit, Sparkles, Filter, ShieldCheck, Zap } from 'lucide-react'

export function AIAnalysis() {
  const location = useLocation()
  const initialId = location.state?.incidentId || null

  const [incidents, setIncidents] = useState([])
  const [selectedIncidentId, setSelectedIncidentId] = useState(initialId)
  const [isBackendLoaded, setIsBackendLoaded] = useState(false)

  const loadBackendIncidents = useCallback(async () => {
    try {
      const rawList = await api.getIncidents()
      if (Array.isArray(rawList)) {
        const mapped = rawList.map(mapBackendIncident).filter(Boolean)
        setIncidents(mapped)
        setIsBackendLoaded(true)
        if (mapped.length > 0) {
          setSelectedIncidentId(prev => {
            if (prev && mapped.some(m => m.id === prev)) return prev
            return mapped[0].id
          })
        } else {
          setSelectedIncidentId(null)
        }
      }
    } catch (err) {
      console.warn('[AIAnalysis] Failed to fetch incidents from backend:', err.message)
      setIncidents([])
      setSelectedIncidentId(null)
    }
  }, [])

  useEffect(() => {
    loadBackendIncidents()
    const interval = setInterval(loadBackendIncidents, 10000)

    const ws = api.connectWebSocket((msg) => {
      if (msg && typeof msg === 'object') {
        const eventType = msg.type || msg.event
        if (['INCIDENT_CREATED', 'INCIDENT_UPDATED', 'LLM_ANALYSIS_COMPLETED'].includes(eventType)) {
          loadBackendIncidents()
        }
      }
    })

    return () => {
      clearInterval(interval)
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [loadBackendIncidents])

  const currentIncident =
    incidents.find(inc => inc.id === selectedIncidentId) ||
    incidents[0] ||
    null

  return (
    <div className="p-4 lg:p-8 space-y-7">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#182130]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-fuchsia-500/20 text-fuchsia-400">
              <BrainCircuit className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black tracking-tight text-white uppercase">
              AI Security Analysis
            </h1>
            {isBackendLoaded && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Backend Live
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            LLM-powered observation and threat reasoning • Autonomous multi-stage kill-chain inference
          </p>
        </div>

        {/* Incident Switcher */}
        {incidents.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold hidden sm:inline">Active Incident:</span>
            <select
              value={selectedIncidentId || ''}
              onChange={(e) => setSelectedIncidentId(e.target.value)}
              className="bg-[#0d121c] border border-[#1e2736] text-purple-300 text-xs rounded-xl px-3 py-1.5 font-mono focus:outline-none focus:border-purple-500 font-bold"
            >
              {incidents.map(inc => (
                <option key={inc.id} value={inc.id}>
                  {inc.id} ({inc.severity}) — {inc.title.slice(0, 36)}...
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {incidents.length === 0 || !currentIncident ? (
        <div className="rounded-2xl p-12 bg-[#0d121c] border border-[#1e2736] text-center text-slate-500 font-mono text-xs space-y-3">
          <BrainCircuit className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="font-semibold text-slate-300 text-sm">No Active Incidents for AI Reasoning</p>
          <p className="text-slate-500 max-w-md mx-auto">
            The Multi-Agent AI system performs root cause analysis and MITRE mapping once telemetry events are correlated into security incidents.
          </p>
        </div>
      ) : (
        <>
          {/* 1. LLM Analysis: Input -> Observation -> Conclusion */}
          <LLMAnalysis incident={currentIncident} />

          {/* 2. Severity Classification & Risk Score */}
          <SeverityCard incident={currentIncident} />

          {/* 3. Recommended Actions & Response Decision Engine */}
          <RecommendedActions incident={currentIncident} />
        </>
      )}
    </div>
  )
}
