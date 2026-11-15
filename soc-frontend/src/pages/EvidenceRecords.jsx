import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'

export function EvidenceRecords({ findings = false }) {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState({ total: 0, events: [], findings: [] })
  const [selected, setSelected] = useState(null)
  const [links, setLinks] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [updated, setUpdated] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const offset = Number(params.get('offset') || 0)
  const control = 'bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm'
  const change = (key, value) => setParams(previous => {
    const next = new URLSearchParams(previous)
    value ? next.set(key, value) : next.delete(key)
    next.delete('offset')
    return next
  })
  useEffect(() => {
    let current = true
    setLoading(true)
    const query = Object.fromEntries(params)
    query.limit = 50
    const promise = findings ? api.searchAgentFindings(query) : api.getEvents(query)
    promise.then(result => {
      if (current) { setData(result); setError(''); setUpdated(new Date()) }
    }).catch(err => { if (current) setError(err.message) })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [params, findings, refresh])
  useEffect(() => { setSelected(null); setLinks(null) }, [findings, params])
  useEffect(() => {
    let current = true
    if (!selected || findings) return
    setLinks(null)
    api.getEventEvidence(selected.event_id).then(result => { if (current) setLinks(result) })
      .catch(err => { if (current) setLinks({ error: err.message }) })
    return () => { current = false }
  }, [selected, findings])
  const rows = findings ? data.findings : data.events
  const exportPage = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ filters: Object.fromEntries(params), total: data.total, records: rows }, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url
    anchor.download = findings ? 'findings-page.json' : 'events-page.json'; anchor.click()
    URL.revokeObjectURL(url)
  }
  return <div className="p-6 space-y-5 text-slate-200">
    <h1 className="text-2xl font-bold">{findings ? 'Agent Findings' : 'Persisted Events'}</h1>
    <p className="text-sm text-slate-400">{loading ? 'Loading…' : `${data.total} matching records`} · {updated ? `Updated ${updated.toISOString()} (UTC)` : 'No successful refresh'}</p>
    <div className="flex gap-3 flex-wrap">
      <input className={control} aria-label="Search records" placeholder="Search ID, evidence or entity" value={params.get('search') || ''} onChange={e => change('search', e.target.value)} />
      <select className={control} aria-label="Severity" value={params.get('severity') || ''} onChange={e => change('severity', e.target.value)}>
        <option value="">All severities</option>{['INFO','LOW','MEDIUM','HIGH','CRITICAL'].map(v => <option key={v}>{v}</option>)}
      </select>
      {findings ? <>
        <input className={control} aria-label="Agent name" placeholder="Exact agent name" value={params.get('agent_name') || ''} onChange={e => change('agent_name', e.target.value)} />
        <select className={control} aria-label="Correlation association" value={params.get('uncorrelated') || ''} onChange={e => change('uncorrelated', e.target.value)}><option value="">Any association</option><option value="true">Not correlated</option><option value="false">Correlated</option></select>
      </> : <>
        {['host','source_type','event_type'].map(key => <input key={key} className={control} aria-label={key} placeholder={key} value={params.get(key) || ''} onChange={e => change(key, e.target.value)} />)}
        <select className={control} aria-label="Demo provenance" value={params.get('is_simulated') || ''} onChange={e => change('is_simulated', e.target.value)}><option value="">All provenance</option><option value="true">Simulated</option><option value="false">Not simulated (inspect source)</option></select>
        {['start_time','end_time'].map(key => <label key={key} className="text-xs">{key} (UTC)<input className={control} type="datetime-local" aria-label={key} value={(params.get(key) || '').replace('Z','')} onChange={e => change(key, e.target.value ? `${e.target.value}Z` : '')} /></label>)}
      </>}
      <button className={control} onClick={() => setRefresh(v => v+1)}>Refresh</button>
      <button className={control} disabled={loading || !!error} onClick={exportPage}>Export current page (JSON)</button>
    </div>
    {error && <p role="alert" className="text-red-300">API error: {error}. Previously loaded records may be stale.</p>}
    <div className="overflow-auto"><table className="w-full text-left text-sm"><thead><tr>{['ID / time (UTC)', findings ? 'Agent / finding' : 'Type / source', 'Severity', 'Evidence / entity'].map(v => <th className="p-3" key={v}>{v}</th>)}</tr></thead>
      <tbody>{(rows || []).map(row => <tr key={row.finding_id || row.event_id} className="border-t border-slate-800 cursor-pointer hover:bg-slate-900" onClick={() => setSelected(row)}>
        <td className="p-3"><button className="text-purple-300" onClick={() => setSelected(row)}>{row.finding_id || row.event_id}</button><div>{row.timestamp || row.created_at}</div></td>
        <td className="p-3">{row.agent_name || row.event_type}<div>{row.title || `${row.source_type} · ${row.source_identifier || 'No collector identifier'}`}</div></td>
        <td className="p-3">{row.severity}</td><td className="p-3">{findings ? `${row.source_event_ids.length} source events` : `${row.host || 'Unknown host'} · ${row.source_ip || ''} → ${row.destination_ip || ''}`}</td>
      </tr>)}</tbody></table></div>
    {!loading && !error && !(rows || []).length && <p>No matching records.</p>}
    <div className="flex gap-4"><button disabled={offset === 0 || loading} onClick={() => setParams(p => { const n = new URLSearchParams(p); n.set('offset', Math.max(0,offset-50)); return n })}>Previous</button><span>{data.total ? offset + 1 : 0}–{Math.min(offset+50,data.total)} / {data.total}</span><button disabled={offset+50 >= data.total || loading} onClick={() => setParams(p => { const n = new URLSearchParams(p); n.set('offset',offset+50); return n })}>Next</button></div>
    {selected && <section className="rounded border border-slate-700 p-4 space-y-3">
      <h2 className="font-bold">Evidence details</h2>
      {findings ? <><p>{selected.incident_id ? <Link to={`/incidents/${selected.incident_id}`}>{selected.incident_id}</Link> : 'Not correlated'}</p><div className="flex gap-3 flex-wrap">{selected.source_event_ids.map(id => <Link className="text-purple-300" key={id} to={`/events?search=${encodeURIComponent(id)}`}>{id}</Link>)}</div><p>Confidence is an agent score; see evidence for its meaning. It is not necessarily a calibrated probability.</p></> : links?.error ? <p role="alert">{links.error}</p> : <><p>{links?.correlation_status || 'Loading evidence links…'}</p>{links?.incident_ids?.map(id => <Link className="text-purple-300 mr-3" key={id} to={`/incidents/${id}`}>{id}</Link>)}{links?.finding_ids?.map(id => <Link className="text-purple-300 mr-3" key={id} to={`/findings?search=${encodeURIComponent(id)}`}>{id}</Link>)}</>}
      <pre className="text-xs whitespace-pre-wrap break-all max-h-96 overflow-auto">{JSON.stringify(selected,null,2)}</pre>
    </section>}
  </div>
}
