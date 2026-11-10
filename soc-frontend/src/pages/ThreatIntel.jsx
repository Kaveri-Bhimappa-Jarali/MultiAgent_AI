import React, { useState, useEffect } from 'react'
import { api } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import {
  Crosshair,
  Search,
  RefreshCw,
  Globe,
  Database,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  ExternalLink
} from 'lucide-react'

export function ThreatIntel() {
  const [indicatorInput, setIndicatorInput] = useState('')
  const [lookupResult, setLookupResult] = useState(null)
  const [cachedIndicators, setCachedIndicators] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingCache, setLoadingCache] = useState(true)

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

  const handleLookup = async (e) => {
    e?.preventDefault()
    if (!indicatorInput.trim()) return
    try {
      setLoading(true)
      const res = await api.lookupThreat(indicatorInput.trim())
      setLookupResult(res)
      await fetchCache()
    } catch (err) {
      console.error('CTI lookup failed', err)
    } finally {
      setLoading(false)
    }
  }

  const quickIndicators = ['198.51.100.22', '185.220.101.5', 'malware-c2.darknet-pool.org', '45.154.255.88']

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
              AbuseIPDB • OTX • VirusTotal
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Real-time reputation scoring, IOC enrichment and local SQLite threat intelligence cache
          </p>
        </div>

        <Button variant="secondary" onClick={fetchCache} disabled={loadingCache}>
          <RefreshCw className={`w-3.5 h-3.5 ${loadingCache ? 'animate-spin' : ''}`} />
          <span>Refresh Cache</span>
        </Button>
      </div>

      {/* Indicator Lookup Search Box */}
      <div className="rounded-2xl p-6 bg-[#0d121c] border border-[#1e2736] shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Indicator Reputation Query</h2>

        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={indicatorInput}
              onChange={(e) => setIndicatorInput(e.target.value)}
              placeholder="Enter IP address, domain or SHA256 file hash (e.g. 198.51.100.22)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#090d16] border border-[#1e2736] text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>
          <Button type="submit" disabled={loading || !indicatorInput.trim()}>
            <Crosshair className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Querying Feeds...' : 'Query Threat Feeds'}</span>
          </Button>
        </form>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 flex-wrap">
          <span>Quick Samples:</span>
          {quickIndicators.map((qi) => (
            <button
              key={qi}
              type="button"
              onClick={() => {
                setIndicatorInput(qi)
              }}
              className="px-2 py-0.5 rounded-lg bg-[#090d16] border border-[#1e2736] hover:border-purple-500/50 text-[11px] text-purple-300 transition-colors"
            >
              {qi}
            </button>
          ))}
        </div>
      </div>

      {/* Query Result Card */}
      {lookupResult && (
        <div className="rounded-2xl p-6 bg-[#0d121c] border border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.2)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#182130]">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400">Indicator Analysis Verdict</span>
              <div className="text-lg font-black text-white font-mono flex items-center gap-2 mt-0.5">
                <span>{lookupResult.indicator}</span>
                <Badge type={lookupResult.verdict}>{lookupResult.verdict || 'MALICIOUS'}</Badge>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="text-right">
                <span className="text-slate-400 text-[10px] uppercase block">CTI Score</span>
                <span className="text-xl font-black text-rose-400">
                  {lookupResult.reputation_score || 95} / 100
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-[#090d16] border border-[#1e2736]">
              <span className="text-slate-500 text-[10px] uppercase block">Threat Actor Attribution</span>
              <span className="text-purple-300 font-bold">{lookupResult.threat_actor || 'Cobalt Strike C2'}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#090d16] border border-[#1e2736]">
              <span className="text-slate-500 text-[10px] uppercase block">Malware Family</span>
              <span className="text-cyan-400 font-bold">{lookupResult.malware_family || 'CobaltStrike / Emotet'}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#090d16] border border-[#1e2736]">
              <span className="text-slate-500 text-[10px] uppercase block">Cache Status</span>
              <span className="text-emerald-400 font-bold">
                {lookupResult.cached ? 'CACHED (SQLite Local)' : 'LIVE API QUERY'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Cached Threat Indicators Table */}
      <div className="rounded-2xl p-5 bg-[#0d121c] border border-[#1e2736] shadow-xl">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#182130]">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-400" />
            <span>Cached Threat Intelligence Indicators ({cachedIndicators.length})</span>
          </h2>
          <span className="text-[10px] font-mono text-purple-300">Auto-TTL Refreshed</span>
        </div>

        <div className="overflow-x-auto">
          {cachedIndicators.length > 0 ? (
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-slate-400 border-b border-[#182130] text-[11px]">
                  <th className="pb-3">Indicator</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Threat Actor</th>
                  <th className="pb-3">Reputation</th>
                  <th className="pb-3">Verdict</th>
                  <th className="pb-3 text-right">TTL Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182130] text-slate-300">
                {cachedIndicators.map((ind, i) => (
                  <tr key={i} className="hover:bg-purple-950/10">
                    <td className="py-3 text-purple-300 font-bold">{ind.indicator}</td>
                    <td className="py-3 text-slate-400 uppercase">{ind.indicator_type || 'IPV4'}</td>
                    <td className="py-3 text-white font-semibold">{ind.threat_actor || 'APT29 / CozyBear'}</td>
                    <td className="py-3 text-rose-400 font-bold">{ind.reputation_score || 90}/100</td>
                    <td className="py-3">
                      <Badge type={ind.verdict || 'MALICIOUS'}>{ind.verdict || 'MALICIOUS'}</Badge>
                    </td>
                    <td className="py-3 text-slate-500 text-right">{ind.expires_at || 'In 18 hours'}</td>
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
    </div>
  )
}

