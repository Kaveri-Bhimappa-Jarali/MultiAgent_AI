import React from 'react'
import { Link } from 'react-router-dom'
import { Network, RefreshCw, Server, Terminal } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useVMNodes, isVMConnected } from '../hooks/useVMNodes'
import { formatSocTimestamp } from '../utils/timestamps'

export function VirtualLab() {
  const { nodes, error, loading, refresh, connectedCount } = useVMNodes()
  return <div className="p-4 lg:p-8 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-white flex items-center gap-2"><Network className="w-6 h-6 text-cyan-400" />Connected VM lab</h1><p className="text-xs text-slate-400 mt-2">Live guest heartbeats and telemetry received by the SOC backend.</p></div>
      <Button onClick={refresh} disabled={loading}><RefreshCw className="w-4 h-4" />Refresh nodes</Button>
    </div>
    {error && <p role="alert" className="text-xs text-amber-300">Cannot refresh VM status: {error}. Showing the last successful snapshot.</p>}
    <p className="text-sm text-slate-400">VMs reporting <strong className="text-emerald-300 ml-2">{connectedCount} / {nodes.length}</strong></p>
    {loading && <p role="status" className="text-xs text-slate-400">Loading connected VMs…</p>}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {nodes.map(node => <article key={node.vm_id} className="rounded-2xl border border-[#1e2736] bg-[#0d121c] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-bold text-white flex items-center gap-2">{node.role === 'ATTACKER' ? <Terminal className="w-5 h-5 text-amber-300" /> : <Server className="w-5 h-5 text-cyan-300" />}{node.role === 'ATTACKER' ? 'Attacker VM' : 'Victim VM · Nginx'}</h2><Badge type={isVMConnected(node) ? 'secure' : 'pending'}>{node.status.replace(/_/g, ' ')}</Badge></div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {[
            ['Node identity', node.vm_id], ['Private IP', node.ip_address], ['Operating system', node.os_info],
            ['Last heartbeat', formatSocTimestamp(node.last_heartbeat_at)], ['Last telemetry', formatSocTimestamp(node.last_telemetry_at)],
            ['Events received', (node.events_count ?? 0).toLocaleString()],
          ].map(([label,value]) => <div key={label}><dt className="text-slate-500 mb-1">{label}</dt><dd className="text-slate-200 font-mono break-words">{value || '—'}</dd></div>)}
        </dl>
        <div className="flex flex-wrap gap-2">{(node.active_collectors || []).map(collector => <span key={collector} className="rounded-lg border border-cyan-500/20 px-2 py-1 text-[10px] text-cyan-300 font-mono">{collector}</span>)}</div>
      </article>)}
    </div>
    {!loading && !nodes.length && !error && <p className="text-sm text-slate-400">No connected lab nodes have been registered.</p>}
    <Link to="/simulation" className="inline-block text-sm text-cyan-300 hover:underline">Open Attack Simulation →</Link>
  </div>
}
