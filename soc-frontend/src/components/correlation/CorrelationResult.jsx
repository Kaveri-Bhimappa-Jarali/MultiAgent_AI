import React from 'react'
import { Link } from 'react-router-dom'
import { GitMerge } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { formatSocTimestamp } from '../../utils/timestamps'

export function CorrelationResult({ incident, correlation }) {
  const { events, sourceIPs, destinations, confidencePercent, firstSeen, lastSeen, durationSeconds, eventTypes } = correlation
  const reasoning = (incident.agent_findings || []).find(finding => finding.agent_name === 'Correlation Agent')
  return <section aria-label="Correlation result" className="min-w-0 rounded-2xl border border-[#1e2736] bg-[#0d121c] p-5 space-y-5">
    <h2 className="text-sm font-bold text-white flex items-center gap-2"><GitMerge className="w-4 h-4 text-cyan-400" />Correlation result</h2>
    <dl className="space-y-3 text-xs">
      {[
        ['Incident ID', incident.incident_id], ['Linked event records', events.length.toLocaleString()],
        ['Recorded cluster count', incident.event_count ?? '—'], ['Attack pattern', incident.title],
        ['Source IPs', sourceIPs.join(', ') || 'Not recorded'], ['Destination IPs', destinations.join(', ') || 'Not recorded'],
        ['Correlation confidence', confidencePercent === null ? 'Not recorded' : `${confidencePercent}%`],
        ['Risk score', incident.risk_score == null ? 'Not recorded' : `${incident.risk_score}/100`],
        ['First linked event', formatSocTimestamp(firstSeen)], ['Last linked event', formatSocTimestamp(lastSeen)],
        ['Observed time span', durationSeconds === null ? 'Not recorded' : `${durationSeconds.toLocaleString()} seconds`],
      ].map(([label,value]) => <div key={label} className="border-b border-[#182130] pb-2"><dt className="text-slate-500 mb-1">{label}</dt><dd className="font-mono text-slate-200 break-words">{value}</dd></div>)}
    </dl>
    <div className="flex flex-wrap gap-2"><Badge type={incident.severity}>{incident.severity}</Badge><Badge type={incident.status}>{incident.status}</Badge><Badge type="pending">Investigation: {incident.investigation_status || 'Not recorded'}</Badge></div>
    <div className="rounded-xl border border-[#1e2736] bg-[#090d16] p-3 text-xs space-y-2">
      <h3 className="font-semibold text-cyan-300">Recorded correlation reasoning</h3>
      <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{reasoning?.description || incident.description || 'No correlation explanation is recorded for this incident.'}</p>
      <p className="text-slate-500">Linked event types: {eventTypes.map(type => type.replace(/_/g, ' ')).join(', ') || 'None recorded'}.</p>
    </div>
    <div className="flex flex-col gap-2 text-xs">
      <Link to={`/incidents/${incident.incident_id}`} className="rounded-lg bg-purple-600 px-4 py-2 text-center font-semibold text-white">Open incident evidence</Link>
      <Link to="/ai-analysis" state={{ incidentId: incident.incident_id }} className="rounded-lg border border-purple-500/30 px-4 py-2 text-center text-purple-300">Open AI analysis</Link>
    </div>
  </section>
}
