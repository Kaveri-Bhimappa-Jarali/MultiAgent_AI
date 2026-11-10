import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { correlatedIncidents as defaultIncidents } from '../data/mockSecurityData'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { SearchInput } from '../components/ui/SearchInput'
import { api } from '../api/client'
import { mapBackendIncident } from '../api/incidentMapper'
import {
  Flame,
  Clock,
  User,
  ArrowRight,
  GitMerge,
  BrainCircuit,
  ShieldAlert,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

export function Incidents() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [incidents, setIncidents] = useState([])
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [isBackendLoaded, setIsBackendLoaded] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function loadIncidents() {
      try {
        const rawList = await api.getIncidents()
        if (isMounted && Array.isArray(rawList) && rawList.length > 0) {
          const mapped = rawList.map(mapBackendIncident).filter(Boolean)
          if (mapped.length > 0) {
            setIncidents(mapped)
            setSelectedIncident(mapped[0])
            setExpandedId(mapped[0].id)
            setIsBackendLoaded(true)
          }
        }
      } catch (err) {
        console.info('[Incidents] Using simulated incidents fallback:', err.message)
        if (isMounted) {
          setIncidents(defaultIncidents)
          setSelectedIncident(defaultIncidents[0])
          setExpandedId(defaultIncidents[0]?.id)
        }
      }
    }
    loadIncidents()
    return () => { isMounted = false }
  }, [])

  const filtered = incidents.filter(inc =>
    String(inc.id || '').toLowerCase().includes(search.toLowerCase()) ||
    String(inc.title || '').toLowerCase().includes(search.toLowerCase()) ||
    String(inc.threatName || '').toLowerCase().includes(search.toLowerCase()) ||
    String(inc.sourceIp || '').includes(search)
  )

  const toggleExpand = (id) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#182130]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
              <Flame className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black tracking-tight text-white uppercase">
              Incident Management & Forensics
            </h1>
            {isBackendLoaded && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Incidents Ingested
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Prioritized security cases generated from correlated attack chains with end-to-end audit lifecycles
          </p>
        </div>

        <div className="w-full md:w-72">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search incident, threat, IP..."
          />
        </div>
      </div>

      {/* Incidents List & Forensics Timeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incidents Cards Column */}
        <div className="lg:col-span-2 space-y-4">
          {filtered.length === 0 ? (
            <div className="rounded-2xl p-12 bg-[#0d121c] border border-[#1e2736] text-center text-slate-500 font-mono text-xs">
              <Flame className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-400">No Incidents Found</p>
              <p className="text-[11px] text-slate-500 mt-1">No security incidents match criteria. Correlate telemetry or run a simulation.</p>
            </div>
          ) : (
            filtered.map(inc => {
              const isSelected = selectedIncident?.id === inc.id
              const isExpanded = expandedId === inc.id

              return (
                <motion.div
                  key={inc.id}
                  layout
                  className={`rounded-2xl p-5 bg-[#0d121c] border transition-all duration-200 ${
                    isSelected
                      ? 'border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                      : 'border-[#1e2736] hover:border-slate-700'
                  }`}
                >
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedIncident(inc)
                      toggleExpand(inc.id)
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-purple-300 bg-purple-950/50 px-2.5 py-1 rounded-lg border border-purple-800/40">
                          {inc.id}
                        </span>
                        <Badge type={inc.severity} size="xs" />
                        <span className="text-xs px-2 py-0.5 rounded bg-[#162030] text-slate-300 font-mono">
                          {inc.relatedEventsCount} Correlated Events
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {inc.detectedTime}
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-white mt-1">
                      {inc.title}
                    </h3>
                    <div className="text-xs font-semibold text-rose-300 mt-0.5">
                      {inc.threatName}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
                      <div>
                        <span>Source IP: </span>
                        <strong className="font-mono text-cyan-300">{inc.sourceIp}</strong>
                      </div>
                      <div>
                        <span>Assigned: </span>
                        <strong className="text-slate-200">{inc.assignedAnalyst}</strong>
                      </div>
                      <div>
                        <span>Status: </span>
                        <strong className="text-purple-300">{inc.status}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details Drawer */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 pt-4 border-t border-[#182130] space-y-3"
                      >
                        <div className="p-3.5 rounded-xl bg-[#090d16] border border-[#1e2736] text-xs text-slate-300 space-y-1.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                            <BrainCircuit className="w-3.5 h-3.5" />
                            <span>Synthesized LLM Observation</span>
                          </div>
                          <p className="leading-relaxed text-[11px] text-slate-300">
                            {inc.llmObservation}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            variant="glow"
                            size="xs"
                            onClick={() => navigate(`/incidents/${inc.id}`)}
                            className="flex items-center gap-1.5"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Deep RCA & DAG Graph</span>
                          </Button>
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => navigate('/ai-analysis', { state: { incidentId: inc.id } })}
                            className="flex items-center gap-1.5"
                          >
                            <BrainCircuit className="w-3.5 h-3.5" />
                            <span>Open Full AI Threat Reasoning</span>
                          </Button>
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => navigate('/correlation')}
                            className="flex items-center gap-1.5"
                          >
                            <GitMerge className="w-3.5 h-3.5" />
                            <span>View Graph Topology</span>
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })
          )}
        </div>

        {/* Selected Incident Lifecycle Timeline */}
        <div className="lg:col-span-1">
          {selectedIncident ? (
            <div className="rounded-2xl p-5 bg-[#0d121c] border border-[#1e2736] shadow-xl sticky top-24 space-y-4">
              <div className="flex items-center justify-between border-b border-[#182130] pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded bg-purple-500/20 text-purple-400">
                    <Clock className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Incident Timeline
                  </h3>
                </div>
                <span className="font-mono text-xs text-purple-300 font-bold">
                  {selectedIncident.id}
                </span>
              </div>

              <p className="text-[11px] text-slate-400">
                Sequential lifecycle demonstrating end-to-end signal progression from initial ingestion to automated triage:
              </p>

              {/* Timeline Vertical Stack */}
              <div className="space-y-4 relative pl-3 pt-2">
                <div className="absolute left-6 top-3 bottom-3 w-0.5 bg-gradient-to-b from-purple-500 via-fuchsia-500 to-rose-500" />

                {selectedIncident.timeline?.map((step, idx) => (
                  <div key={idx} className="relative flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#111827] border border-purple-500/50 flex items-center justify-center text-xs flex-shrink-0 z-10 shadow-md">
                      {step.icon || '●'}
                    </div>

                    <div className="flex-1 bg-[#090d16] p-2.5 rounded-xl border border-[#1e2736] text-xs">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-white text-[11px]">{step.stage}</span>
                        <span className="font-mono text-[10px] text-purple-300">{step.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Response Outcome Badge */}
              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs flex items-center justify-between pt-3 mt-4">
                <span className="text-slate-400">Recommended Action:</span>
                <span className="font-bold text-rose-300 font-mono">
                  {selectedIncident.recommendedDecision}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-8 bg-[#0d121c] border border-[#1e2736] text-center text-slate-500 text-xs font-mono">
              <Clock className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p>Select an incident to view forensic timeline</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
