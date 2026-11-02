import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { correlatedIncidents as defaultIncidents } from '../data/mockSecurityData'
import { LLMAnalysis } from '../components/ai/LLMAnalysis'
import { SeverityCard } from '../components/ai/SeverityCard'
import { RecommendedActions } from '../components/ai/RecommendedActions'
import { api } from '../api/client'
import { mapBackendIncident } from '../api/incidentMapper'
import { BrainCircuit, Sparkles, Filter, ShieldCheck, Zap } from 'lucide-react'

export function AIAnalysis() {
  const location = useLocation()
  const initialId = location.state?.incidentId || 'INC-2026-001'

  const [incidents, setIncidents] = useState(defaultIncidents)
  const [selectedIncidentId, setSelectedIncidentId] = useState(initialId)
  const [isBackendLoaded, setIsBackendLoaded] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function loadBackendIncidents() {
      try {
        const rawList = await api.getIncidents()
        if (isMounted && Array.isArray(rawList) && rawList.length > 0) {
          const mapped = rawList.map(mapBackendIncident).filter(Boolean)
          if (mapped.length > 0) {
            setIncidents(prev => {
              const existingIds = new Set(mapped.map(m => m.id))
              const remaining = prev.filter(p => !existingIds.has(p.id))
              return [...mapped, ...remaining]
            })
            setIsBackendLoaded(true)
            if (!location.state?.incidentId) {
              setSelectedIncidentId(mapped[0].id)
            }
          }
        }
      } catch (err) {
        console.info('[AIAnalysis] Using simulated model data:', err.message)
      }
    }
    loadBackendIncidents()
    return () => { isMounted = false }
  }, [location.state?.incidentId])

  const currentIncident =
    incidents.find(inc => inc.id === selectedIncidentId) ||
    incidents[0]

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
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold hidden sm:inline">Active Incident:</span>
          <select
            value={selectedIncidentId}
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
      </div>

      {/* 1. LLM Analysis: Input -> Observation -> Conclusion */}
      <LLMAnalysis incident={currentIncident} />

      {/* 2. Severity Classification & Risk Score */}
      <SeverityCard incident={currentIncident} />

      {/* 3. Recommended Actions & Response Decision Engine */}
      <RecommendedActions incident={currentIncident} />
    </div>
  )
}
