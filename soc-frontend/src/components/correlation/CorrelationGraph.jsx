import React, { useEffect, useState } from 'react'
import { ArrowDown, GitMerge } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { formatSocTimestamp } from '../../utils/timestamps'

export function CorrelationGraph({ incident, correlation }) {
  const [selectedId, setSelectedId] = useState(null)
  const [limit, setLimit] = useState(50)
  useEffect(() => { setSelectedId(null); setLimit(50) }, [incident.incident_id])
  const { events, sourceIPs, confidencePercent } = correlation
  const selected = events.find(event => event.event_id === selectedId)

  return <section aria-label="Incident event graph" className="rounded-2xl border border-[#1e2736] bg-[#0d121c] p-5 space-y-5">
    <div className="border-b border-[#182130] pb-4">
      <h2 className="text-sm font-bold text-white flex items-center gap-2"><GitMerge className="w-4 h-4 text-cyan-400" />Linked event chronology</h2>
      <p className="text-xs text-slate-400 mt-2">Source IPs: <span className="font-mono text-purple-300 break-all">{sourceIPs.join(', ') || 'Not recorded'}</span></p>
      <p className="text-xs text-cyan-300 mt-2">{events.length} linked event records · {incident.incident_id}</p>
      <p className="text-[10px] text-slate-500 mt-1">Arrows show recorded time order. Select an event to inspect its evidence.</p>
    </div>
    {!events.length && <p className="py-8 text-center text-sm text-slate-400">No linked event records are available for this incident.</p>}
    <div className="space-y-2">
      {events.slice(0, limit).map((event, index) => <React.Fragment key={event.event_id}>
        {index > 0 && <ArrowDown aria-hidden="true" className="w-4 h-4 text-purple-400 mx-auto" />}
        <button aria-label={`View event ${event.event_id}`} aria-expanded={selectedId === event.event_id} onClick={() => setSelectedId(previous => previous === event.event_id ? null : event.event_id)}
          className={`w-full text-left rounded-xl border p-4 transition-colors ${selectedId === event.event_id ? 'border-purple-400 bg-purple-950/30' : 'border-[#1e2736] bg-[#090d16] hover:border-slate-600'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-xs text-white break-all">{event.event_id}</span><Badge type={event.severity} size="xs" /></div>
          <p className="text-xs font-semibold text-purple-300 mt-2">{(event.event_type || 'Unspecified event').replace(/_/g, ' ')}</p>
          <p className="text-[11px] text-slate-400 mt-1 break-words">{event.command_line || event.file_action || event.process_name || 'No command or action recorded'}</p>
          <div className="flex flex-wrap justify-between gap-2 text-[10px] text-slate-500 mt-3"><span>{formatSocTimestamp(event.timestamp)}</span><span className="font-mono text-cyan-300">{event.source_ip || 'Unknown source'} → {event.destination_ip || event.host || 'Unknown destination'}{event.destination_port != null ? `:${event.destination_port}` : ''}</span></div>
        </button>
        {selectedId === event.event_id && <div role="region" className="rounded-xl border border-purple-500/20 p-4 text-xs space-y-2" aria-label="Selected event evidence">
          <p className="text-slate-300">Host: {selected?.host || '—'} · Protocol: {selected?.protocol || '—'} · Collector: {selected?.source_identifier || '—'}</p>
          <p className="text-slate-400">Received {formatSocTimestamp(selected?.ingested_at)} · {selected?.is_simulated ? 'Simulated event' : 'Recorded event'}</p>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-[10px] text-slate-400">{typeof selected?.raw_payload === 'string' ? selected.raw_payload : selected?.raw_payload ? JSON.stringify(selected.raw_payload, null, 2) : 'No raw payload recorded.'}</pre>
        </div>}
      </React.Fragment>)}
    </div>
    {events.length > limit && <button onClick={() => setLimit(value => value + 50)} className="text-xs text-cyan-300 hover:underline">Show more events ({limit} of {events.length} shown)</button>}
    <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4" aria-label="Selected correlated incident">
      <p className="text-[10px] uppercase tracking-wide text-purple-300">Correlated incident</p>
      <h3 className="text-base font-bold text-white mt-1">{incident.title}</h3>
      <p className="text-xs text-slate-400 mt-2">{events.length} linked event records · Confidence: {confidencePercent === null ? 'Not recorded' : `${confidencePercent}%`} · {incident.incident_id}</p>
    </div>
  </section>
}
