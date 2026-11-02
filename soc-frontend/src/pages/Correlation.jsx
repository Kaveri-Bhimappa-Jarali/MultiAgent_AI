import React, { useState, useEffect } from 'react'
import { correlatedIncidents as defaultIncidents } from '../data/mockSecurityData'
import { CorrelationGraph } from '../components/correlation/CorrelationGraph'
import { CorrelationResult } from '../components/correlation/CorrelationResult'
import { api } from '../api/client'
import { mapBackendIncident } from '../api/incidentMapper'
import { GitMerge, Cpu, Network, ShieldCheck, Zap } from 'lucide-react'

export function Correlation() {
  const [incidents, setIncidents] = useState(defaultIncidents)
  const [selectedIncident, setSelectedIncident] = useState(defaultIncidents[0])
  const [isBackendLoaded, setIsBackendLoaded] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function loadIncidents() {
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
            setSelectedIncident(mapped[0])
            setIsBackendLoaded(true)
          }
        }
      } catch (err) {
        console.info('[Correlation] Using simulated attack chains:', err.message)
      }
    }
    loadIncidents()
    return () => { isMounted = false }
  }, [])

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#182130]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
              <GitMerge className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black tracking-tight text-white uppercase">
              Event Correlation Engine
            </h1>
            {isBackendLoaded && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
                Backend Live
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Identify relationships between multiple security events across spatial and temporal dimensions
          </p>
        </div>

        {/* Attack Chain Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold hidden sm:inline">Active Chains:</span>
          <select
            value={selectedIncident.id}
            onChange={(e) => {
              const found = incidents.find(inc => inc.id === e.target.value)
              if (found) setSelectedIncident(found)
            }}
            className="bg-[#0d121c] border border-[#1e2736] text-slate-200 text-xs rounded-xl px-3 py-1.5 font-mono focus:outline-none focus:border-cyan-500"
          >
            {incidents.map(inc => (
              <option key={inc.id} value={inc.id}>
                {inc.id} — {inc.title.slice(0, 32)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4 Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl p-4 bg-[#0d121c] border border-[#1e2736] shadow-md flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Events Received</div>
            <div className="text-xl font-black text-white mt-0.5">12,847</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
            📥
          </div>
        </div>

        <div className="rounded-xl p-4 bg-[#0d121c] border border-[#1e2736] shadow-md flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Correlated Events</div>
            <div className="text-xl font-black text-cyan-300 mt-0.5">248</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
            🔗
          </div>
        </div>

        <div className="rounded-xl p-4 bg-[#0d121c] border border-[#1e2736] shadow-md flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Active Attack Chains</div>
            <div className="text-xl font-black text-rose-300 mt-0.5">{incidents.length}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
            🔥
          </div>
        </div>

        <div className="rounded-xl p-4 bg-[#0d121c] border border-[#1e2736] shadow-md flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Correlation Accuracy</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">94%</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            ✓
          </div>
        </div>
      </div>

      {/* Main Grid: Correlation Graph + Result Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CorrelationGraph
            incident={selectedIncident}
            onSelectEventNode={(node) => {}}
          />
        </div>

        <div className="lg:col-span-1">
          <CorrelationResult
            incident={selectedIncident}
          />
        </div>
      </div>
    </div>
  )
}
