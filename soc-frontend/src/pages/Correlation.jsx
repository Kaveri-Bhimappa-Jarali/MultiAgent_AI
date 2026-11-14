import React, { useEffect, useMemo, useState } from 'react'
import { CorrelationGraph } from '../components/correlation/CorrelationGraph'
import { CorrelationResult } from '../components/correlation/CorrelationResult'
import { api } from '../api/client'
import { GitMerge, RefreshCw } from 'lucide-react'
import { deriveCorrelationData } from '../utils/correlationData'
import { formatSocTimestamp } from '../utils/timestamps'

export function Correlation() {
  const [incidents, setIncidents] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [summary, setSummary] = useState(null)
  const [listError, setListError] = useState('')
  const [detailError, setDetailError] = useState('')
  const [listLoading, setListLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [refreshVersion, setRefreshVersion] = useState(0)

  useEffect(() => {
    let active = true
    let busy = false
    async function refresh() {
      if (busy) return
      busy = true
      try {
        const [list, metrics] = await Promise.all([api.getIncidents(), api.getDashboardSummary().catch(() => null)])
        if (!Array.isArray(list)) throw new Error('Invalid incident list response')
        if (!active) return
        setIncidents(list)
        if (metrics) setSummary(metrics)
        setSelectedId(previous => list.some(incident => incident.incident_id === previous) ? previous : list[0]?.incident_id || '')
        setListError('')
      } catch (error) {
        if (active) setListError(error.message || 'Cannot load incidents')
      } finally {
        busy = false
        if (active) setListLoading(false)
      }
    }
    refresh()
    const interval = setInterval(() => { if (!document.hidden) refresh() }, 10000)
    return () => { active = false; clearInterval(interval) }
  }, [refreshVersion])

  useEffect(() => {
    if (!selectedId) { setDetail(null); setDetailLoading(false); return }
    let active = true
    let busy = false
    setDetailLoading(true)
    setDetailError('')
    async function refresh() {
      if (busy) return
      busy = true
      try {
        const result = await api.getIncidentDetail(selectedId)
        if (result.incident_id !== selectedId) throw new Error('Incident response does not match the selection')
        if (!active) return
        setDetail(result)
        setDetailError('')
        setUpdatedAt(new Date().toISOString())
      } catch (error) {
        if (active) setDetailError(error.message || 'Cannot load linked evidence')
      } finally {
        busy = false
        if (active) setDetailLoading(false)
      }
    }
    refresh()
    const interval = setInterval(() => { if (!document.hidden) refresh() }, 10000)
    return () => { active = false; clearInterval(interval) }
  }, [selectedId, refreshVersion])

  const selected = detail?.incident_id === selectedId ? detail : null
  const correlation = useMemo(() => deriveCorrelationData(selected), [selected])
  const confidence = correlation.confidencePercent
  const metrics = [
    ['Events received', summary?.metrics?.total_events ?? '—'],
    ['Incidents loaded', incidents.length],
    ['Open incidents', summary?.metrics?.open_incidents ?? '—'],
    ['Selected confidence', confidence === null ? '—' : `${confidence}%`],
  ]

  return <div className="p-4 lg:p-8 space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#182130] pb-4">
      <div><h1 className="text-xl font-black text-white uppercase flex items-center gap-2"><GitMerge className="w-5 h-5 text-cyan-400" />Event Correlation Engine</h1>
        <p className="text-xs text-slate-400 mt-2">Linked event evidence and observed chronology for the selected incident.</p>
        <p className="text-[10px] font-mono text-slate-500 mt-2">{updatedAt ? `Evidence refreshed ${formatSocTimestamp(updatedAt)}` : 'Loading recorded correlation data…'} · refreshes every 10 seconds</p>
      </div>
      <div className="flex min-w-0 w-full sm:w-auto flex-wrap items-center gap-2">
        <label htmlFor="correlation-incident" className="text-xs text-slate-400">Incident</label>
        <select id="correlation-incident" value={selectedId} onChange={event => setSelectedId(event.target.value)} className="min-w-0 w-0 sm:w-auto flex-1 sm:flex-none max-w-full sm:max-w-xs rounded-xl border border-[#1e2736] bg-[#0d121c] px-3 py-2 text-xs text-slate-200 font-mono">
          {!incidents.length && <option value="">{listLoading ? 'Loading incidents…' : 'No incidents recorded'}</option>}
          {incidents.map(incident => <option key={incident.incident_id} value={incident.incident_id}>{incident.incident_id} — {incident.title}</option>)}
        </select>
        <button aria-label="Refresh correlation data" onClick={() => setRefreshVersion(value => value + 1)} className="rounded-lg border border-[#1e2736] p-2 text-cyan-300"><RefreshCw className="w-4 h-4" /></button>
      </div>
    </div>
    {(listError || detailError) && <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200">{listError || detailError}{selected ? ' Showing the last successful evidence snapshot.' : ''}</p>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{metrics.map(([label,value]) => <div key={label} className="rounded-xl border border-[#1e2736] bg-[#0d121c] p-4"><p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p><p className="text-2xl font-bold text-cyan-300 mt-2 tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</p></div>)}</div>
    {selected ? <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 min-w-0"><CorrelationGraph incident={selected} correlation={correlation} /></div>
      <CorrelationResult incident={selected} correlation={correlation} />
    </div> : <p role="status" className="rounded-xl border border-[#1e2736] p-8 text-sm text-slate-400">{listLoading || detailLoading ? 'Loading linked event evidence…' : selectedId ? 'Evidence is unavailable for this incident. Try refreshing.' : 'No incidents have been recorded yet.'}</p>}
  </div>
}
