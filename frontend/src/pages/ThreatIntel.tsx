import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { ThreatIndicator, ThreatLookupResult } from '../types';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { Crosshair, Search, Shield, AlertTriangle, ExternalLink, CheckCircle } from 'lucide-react';

export const ThreatIntel: React.FC = () => {
  const [indicators, setIndicators] = useState<ThreatIndicator[]>([]);
  const [query, setQuery] = useState('');
  const [lookupResult, setLookupResult] = useState<ThreatLookupResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getIndicators()
      .then(setIndicators)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      setSearching(true);
      const res = await api.lookupThreat(query.trim());
      setLookupResult(res);
    } catch (err) {
      console.error('Failed to lookup indicator', err);
    } finally {
      setSearching(false);
    }
  };

  const handleQuickLookup = async (val: string) => {
    setQuery(val);
    try {
      setSearching(true);
      const res = await api.lookupThreat(val);
      setLookupResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-navy-700/80">
        <h1 className="text-2xl font-bold tracking-tight text-softwhite flex items-center space-x-2">
          <span>CYBER THREAT INTELLIGENCE (CTI) HUB</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-royal/20 text-royal-200 border border-royal/30 font-mono">
            INDICATOR ENRICHMENT
          </span>
        </h1>
        <p className="text-xs text-mutedslate mt-1 font-mono">
          Query IP addresses, domains and hashes against curated threat actor indicators, botnets and C2 infrastructure.
        </p>
      </div>

      {/* Indicator Lookup Search */}
      <div className="p-6 rounded-2xl bg-navy-800 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-semibold text-softwhite font-mono flex items-center space-x-2">
          <Crosshair className="w-4 h-4 text-gold" />
          <span>Real-Time Observable Lookup</span>
        </h3>

        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-mutedslate absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter IP (e.g. 198.51.100.23), domain (update-service-cloud.xyz), or SHA256 hash..."
              className="w-full bg-navy-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-xs text-softwhite placeholder-slate-500 font-mono focus:border-royal outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-royal to-purple-700 hover:from-royal-600 text-softwhite font-medium text-xs font-mono transition shadow-lg shadow-royal/25 disabled:opacity-50"
          >
            {searching ? 'Querying CTI Feed...' : 'Enrich Observable'}
          </button>
        </form>

        {/* Lookup Result Card */}
        {lookupResult && (
          <div className="mt-4 p-5 rounded-xl bg-navy-900 border border-royal/40 space-y-3 font-mono text-xs animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-navy-700">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-softwhite text-sm">{lookupResult.indicator}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  lookupResult.risk_level === 'MALICIOUS' ? 'bg-red-500/20 text-soccritical border border-soccritical/40' :
                  lookupResult.risk_level === 'SUSPICIOUS' ? 'bg-amber-500/20 text-socwarning border border-socwarning/40' :
                  'bg-emerald-500/20 text-socsuccess border border-socsuccess/40'
                }`}>
                  {lookupResult.risk_level}
                </span>
              </div>
              <span className="text-gold font-bold">
                Reputation Score: {lookupResult.reputation_score} / 100
              </span>
            </div>

            {lookupResult.threat_details ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
                  <div>Threat: <span className="text-softwhite font-semibold">{lookupResult.threat_details.threat_name}</span></div>
                  <div>Actor: <span className="text-gold font-semibold">{lookupResult.threat_details.threat_actor}</span></div>
                  <div>Type: <span className="text-royal-200">{lookupResult.threat_details.indicator_type}</span></div>
                  <div>Severity: <SeverityBadge severity={lookupResult.threat_details.severity} size="sm" /></div>
                </div>
                <p className="text-slate-300 font-sans">{lookupResult.threat_details.description}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {lookupResult.threat_details.tags.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded bg-navy-800 text-royal-200 border border-royal/30 text-[10px]">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 font-sans">
                No verified malicious campaigns associated with this indicator in local CTI feeds.
              </p>
            )}

            {lookupResult.recommendations.length > 0 && (
              <div className="pt-2 border-t border-navy-800">
                <span className="text-mutedslate text-[10px] uppercase font-bold">Recommended Defenses:</span>
                <ul className="list-disc list-inside text-slate-300 font-sans mt-1 space-y-0.5">
                  {lookupResult.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Curated CTI Indicators Table */}
      <div className="bg-navy-800 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-navy-950/70 border-b border-navy-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-softwhite font-mono">Curated Threat Feed Indicators</h3>
          <span className="text-xs text-mutedslate font-mono">{indicators.length} indicators cached</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-navy-950/80 border-b border-navy-700 text-mutedslate uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Observable</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Threat Name</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700/60 text-softwhite">
              {indicators.map((ind) => (
                <tr
                  key={ind.id}
                  onClick={() => handleQuickLookup(ind.indicator_value)}
                  className="hover:bg-navy-700/40 cursor-pointer transition"
                >
                  <td className="py-3 px-4 font-bold text-royal-200">{ind.indicator_value}</td>
                  <td className="py-3 px-4 text-slate-400">{ind.indicator_type}</td>
                  <td className="py-3 px-4">{ind.threat_name}</td>
                  <td className="py-3 px-4 text-gold">{ind.threat_actor}</td>
                  <td className="py-3 px-4"><SeverityBadge severity={ind.severity} size="sm" /></td>
                  <td className="py-3 px-4">{Math.round(ind.confidence * 100)}%</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {ind.tags.map((t) => (
                        <span key={t} className="px-1.5 py-0.2 rounded bg-navy-900 text-slate-300 text-[9px]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
