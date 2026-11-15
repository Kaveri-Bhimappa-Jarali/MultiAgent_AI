import React, { useState, useEffect } from 'react'
import { api } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import {
  Crosshair,
  Search,
  RefreshCw,
  PlusCircle,
  Database,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Tag,
  AlertTriangle,
  FileCode,
  Globe,
  Lock
} from 'lucide-react'

export function ThreatIntel() {
  const [indicatorInput, setIndicatorInput] = useState('')
  const [lookupResult, setLookupResult] = useState(null)
  const [cachedIndicators, setCachedIndicators] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingCache, setLoadingCache] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addingIndicator, setAddingIndicator] = useState(false)
  const [newIndicator, setNewIndicator] = useState({
    indicator_type: 'IP',
    indicator_value: '',
    threat_name: '',
    threat_actor: '',
    severity: 'HIGH',
    confidence: 0.90,
    tags: '',
    description: ''
  })

  const fetchCache = async () => {
    try {
      setLoadingCache(true)
      const list = await api.getIndicators().catch(() => [])
      setCachedIndicators(list || [])
    } catch (err) {
      console.error('Failed to load CTI cache', err)
    } finally {
      setLoadingCache(false)
    }
  }

  useEffect(() => {
    fetchCache()
  }, [])

  const handleLookup = async (inputVal) => {
    const val = typeof inputVal === 'string' ? inputVal : indicatorInput
    if (!val.trim()) return
    try {
      setLoading(true)
      setIndicatorInput(val.trim())
      const res = await api.lookupThreat(val.trim())
      setLookupResult(res)
      await fetchCache()
    } catch (err) {
      console.error('CTI lookup failed', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddIndicator = async (e) => {
    e.preventDefault()
    if (!newIndicator.indicator_value.trim() || !newIndicator.threat_name.trim()) return
    try {
      setAddingIndicator(true)
      const tagsList = newIndicator.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)

      await api.addIndicator({
        indicator_type: newIndicator.indicator_type,
        indicator_value: newIndicator.indicator_value.trim(),
        threat_name: newIndicator.threat_name.trim(),
        threat_actor: newIndicator.threat_actor.trim() || 'Unknown Threat Actor',
        severity: newIndicator.severity,
        confidence: parseFloat(newIndicator.confidence) || 0.9,
        tags: tagsList,
        description: newIndicator.description.trim() || null
      })

      setShowAddModal(false)
      setNewIndicator({
        indicator_type: 'IP',
        indicator_value: '',
        threat_name: '',
        threat_actor: '',
        severity: 'HIGH',
        confidence: 0.90,
        tags: '',
        description: ''
      })
      await fetchCache()
      await handleLookup(newIndicator.indicator_value.trim())
    } catch (err) {
      console.error('Failed to add indicator', err)
    } finally {
      setAddingIndicator(false)
    }
  }

  const quickIndicators = [
    { label: 'Cloud Attacker VM (45.74.156.44)', value: '45.74.156.44' },
    { label: 'Cobalt Strike C2 (198.51.100.23)', value: '198.51.100.23' },
    { label: 'Emotet Botnet (203.0.113.88)', value: '203.0.113.88' },
    { label: 'Port Scanner (192.0.2.144)', value: '192.0.2.144' },
    { label: 'Lazarus C2 (update-service-cloud.xyz)', value: 'update-service-cloud.xyz' },
    { label: 'FIN7 Dropper Hash', value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' }
  ]

  return (
    <div className="p-4 lg:p-8 space-y-7">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Crosshair className="w-6 h-6 text-emerald-400" />
              <span>Cyber Threat Intelligence (CTI)</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold">
              AbuseIPDB • OTX • VirusTotal • Local Cache
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Autonomous observable harvesting, reputation scoring, IOC enrichment, and threat actor attribution
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowAddModal(true)}>
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add IOC</span>
          </Button>
          <Button variant="secondary" onClick={fetchCache} disabled={loadingCache}>
            <RefreshCw className={`w-3.5 h-3.5 ${loadingCache ? 'animate-spin' : ''}`} />
            <span>Refresh Cache</span>
          </Button>
        </div>
      </div>

      {/* Indicator Lookup Search Box */}
      <div className="rounded-2xl p-6 bg-[#0d121c] border border-[#1e2736] shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Search className="w-4 h-4 text-emerald-400" />
          <span>Indicator Reputation Query & Enrichment</span>
        </h2>

        <form onSubmit={(e) => { e.preventDefault(); handleLookup(); }} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={indicatorInput}
              onChange={(e) => setIndicatorInput(e.target.value)}
              placeholder="Enter IP address, domain or SHA256 file hash (e.g. 45.74.156.44 or 198.51.100.23)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#090d16] border border-[#1e2736] text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <Button type="submit" disabled={loading || !indicatorInput.trim()}>
            <Crosshair className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Querying Feeds...' : 'Query Threat Feeds'}</span>
          </Button>
        </form>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 flex-wrap">
          <span className="text-slate-500 font-semibold">Curated Samples:</span>
          {quickIndicators.map((qi, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleLookup(qi.value)}
              className="px-2.5 py-1 rounded-lg bg-[#090d16] border border-[#1e2736] hover:border-emerald-500/50 hover:bg-emerald-950/20 text-[11px] text-slate-300 hover:text-emerald-300 transition-colors"
            >
              {qi.label}
            </button>
          ))}
        </div>
      </div>

      {/* Query Result Card */}
      {lookupResult && (
        <div className="rounded-2xl p-6 bg-[#0d121c] border border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.15)] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#182130]">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400">Threat Intelligence Verdict</span>
              <div className="text-lg font-black text-white font-mono flex items-center gap-2.5 mt-0.5">
                <span>{lookupResult.indicator}</span>
                <Badge type={lookupResult.risk_level || 'UNKNOWN'}>
                  {lookupResult.risk_level || 'UNKNOWN'}
                </Badge>
                {lookupResult.found ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                    <ShieldAlert className="w-3 h-3" /> MATCH CONFIRMED
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800/40 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" /> NO CTI MATCH
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="text-right">
                <span className="text-slate-400 text-[10px] uppercase block">Reputation Score</span>
                <span className={`text-2xl font-black ${
                  lookupResult.reputation_score >= 80 ? 'text-rose-400' :
                  lookupResult.reputation_score >= 50 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {lookupResult.reputation_score} / 100
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-[#090d16] border border-[#1e2736]">
              <span className="text-slate-500 text-[10px] uppercase block font-semibold">Threat Actor Attribution</span>
              <span className="text-purple-300 font-bold text-sm mt-0.5 block">
                {lookupResult.threat_details?.threat_actor || 'Unknown / Unattributed'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#090d16] border border-[#1e2736]">
              <span className="text-slate-500 text-[10px] uppercase block font-semibold">Threat / Campaign Name</span>
              <span className="text-cyan-400 font-bold text-sm mt-0.5 block">
                {lookupResult.threat_details?.threat_name || 'Generic External Traffic'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#090d16] border border-[#1e2736]">
              <span className="text-slate-500 text-[10px] uppercase block font-semibold">Severity / Confidence</span>
              <span className="text-amber-300 font-bold text-sm mt-0.5 block">
                {lookupResult.threat_details?.severity || 'MEDIUM'} • {Math.round((lookupResult.threat_details?.confidence || 0.5) * 100)}%
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#090d16] border border-[#1e2736]">
              <span className="text-slate-500 text-[10px] uppercase block font-semibold">Intelligence Source</span>
              <span className="text-emerald-400 font-bold text-sm mt-0.5 block truncate">
                {lookupResult.source || 'LOCAL_CTI_DATABASE'}
              </span>
            </div>
          </div>

          {lookupResult.threat_details?.description && (
            <div className="p-3.5 rounded-xl bg-[#090d16] border border-[#1e2736] text-xs font-mono space-y-1">
              <span className="text-slate-500 text-[10px] uppercase block font-semibold">Adversary Profile & Behavioral Context</span>
              <p className="text-slate-300 leading-relaxed">{lookupResult.threat_details.description}</p>
            </div>
          )}

          {lookupResult.threat_details?.tags?.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
              <span className="text-slate-500 text-[10px] uppercase font-semibold flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-400" /> Tags:
              </span>
              {lookupResult.threat_details.tags.map((t, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded-md bg-purple-950/40 border border-purple-800/40 text-purple-300 text-[11px]">
                  #{t}
                </span>
              ))}
            </div>
          )}

          {lookupResult.recommendations?.length > 0 && (
            <div className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736] space-y-2">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Actionable SOAR Playbook Recommendations
              </span>
              <ul className="space-y-1.5 text-xs font-mono text-slate-300">
                {lookupResult.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">›</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Cached Threat Indicators Table */}
      <div className="rounded-2xl p-5 bg-[#0d121c] border border-[#1e2736] shadow-xl">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#182130]">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Curated Threat Intelligence Indicators ({cachedIndicators.length})</span>
          </h2>
          <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40">
            Active Multi-Agent Feed
          </span>
        </div>

        <div className="overflow-x-auto">
          {cachedIndicators.length > 0 ? (
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-slate-400 border-b border-[#182130] text-[11px]">
                  <th className="pb-3">Indicator</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Threat Name / Campaign</th>
                  <th className="pb-3">Threat Actor</th>
                  <th className="pb-3">Confidence</th>
                  <th className="pb-3">Severity</th>
                  <th className="pb-3">Tags</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182130] text-slate-300">
                {cachedIndicators.map((ind, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 text-white font-bold font-mono">
                      {ind.indicator_value || ind.indicator}
                    </td>
                    <td className="py-3 text-slate-400 uppercase font-semibold">
                      {ind.indicator_type || 'IP'}
                    </td>
                    <td className="py-3 text-cyan-300 font-semibold">
                      {ind.threat_name || 'Generic C2'}
                    </td>
                    <td className="py-3 text-purple-300 font-semibold">
                      {ind.threat_actor || 'Unknown Actor'}
                    </td>
                    <td className="py-3 text-emerald-400 font-bold">
                      {Math.round((ind.confidence || 0) * 100)}%
                    </td>
                    <td className="py-3">
                      <Badge type={ind.severity || 'HIGH'}>{ind.severity || 'HIGH'}</Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1 flex-wrap max-w-xs">
                        {(ind.tags || []).slice(0, 3).map((t, tidx) => (
                          <span key={tidx} className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleLookup(ind.indicator_value || ind.indicator)}
                        className="px-2.5 py-1 rounded bg-[#090d16] border border-[#1e2736] hover:border-emerald-500/50 text-[11px] text-emerald-400 hover:bg-emerald-950/20 transition-all font-semibold"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">
              No threat indicators in cache yet. Enter an indicator above to enrich.
            </div>
          )}
        </div>
      </div>

      {/* Add Indicator Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0d121c] border border-[#1e2736] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#182130]">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>Register New Threat Indicator (IOC)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddIndicator} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">Indicator Type</label>
                  <select
                    value={newIndicator.indicator_type}
                    onChange={(e) => setNewIndicator({ ...newIndicator, indicator_type: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#090d16] border border-[#1e2736] text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="IP">IP Address</option>
                    <option value="DOMAIN">Domain Name</option>
                    <option value="SHA256">SHA256 Hash</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">Severity</label>
                  <select
                    value={newIndicator.severity}
                    onChange={(e) => setNewIndicator({ ...newIndicator, severity: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#090d16] border border-[#1e2736] text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Indicator Value</label>
                <input
                  type="text"
                  required
                  value={newIndicator.indicator_value}
                  onChange={(e) => setNewIndicator({ ...newIndicator, indicator_value: e.target.value })}
                  placeholder="e.g. 198.51.100.99 or c2-evil.com"
                  className="w-full p-2.5 rounded-xl bg-[#090d16] border border-[#1e2736] text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Threat / Campaign Name</label>
                <input
                  type="text"
                  required
                  value={newIndicator.threat_name}
                  onChange={(e) => setNewIndicator({ ...newIndicator, threat_name: e.target.value })}
                  placeholder="e.g. Cobalt Strike Team Server"
                  className="w-full p-2.5 rounded-xl bg-[#090d16] border border-[#1e2736] text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">Threat Actor</label>
                  <input
                    type="text"
                    value={newIndicator.threat_actor}
                    onChange={(e) => setNewIndicator({ ...newIndicator, threat_actor: e.target.value })}
                    placeholder="e.g. APT29 / Lazarus"
                    className="w-full p-2.5 rounded-xl bg-[#090d16] border border-[#1e2736] text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">Confidence (0.1 - 1.0)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="1.0"
                    value={newIndicator.confidence}
                    onChange={(e) => setNewIndicator({ ...newIndicator, confidence: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#090d16] border border-[#1e2736] text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newIndicator.tags}
                  onChange={(e) => setNewIndicator({ ...newIndicator, tags: e.target.value })}
                  placeholder="e.g. C2, Beacon, Attacker"
                  className="w-full p-2.5 rounded-xl bg-[#090d16] border border-[#1e2736] text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Description / Intel Context</label>
                <textarea
                  rows={2}
                  value={newIndicator.description}
                  onChange={(e) => setNewIndicator({ ...newIndicator, description: e.target.value })}
                  placeholder="Observational notes from threat research or external feed..."
                  className="w-full p-2.5 rounded-xl bg-[#090d16] border border-[#1e2736] text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#182130]">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addingIndicator}>
                  {addingIndicator ? 'Registering...' : 'Save Indicator'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
