import React from 'react'
import { Link } from 'react-router-dom'
import { useVMNodes, isVMConnected } from '../../hooks/useVMNodes'

export function VMReporting() {
  const { nodes, error, loading, connectedCount } = useVMNodes()
  return <section aria-label="Connected lab VMs" className="flex flex-wrap items-center gap-3 rounded-xl border border-cyan-500/20 bg-[#0d121c] px-4 py-3 text-xs">
    <span className="text-slate-400">VMs reporting <strong className="text-emerald-300 ml-1">{loading ? 'Checking…' : `${connectedCount} / ${nodes.length}`}</strong></span>
    {nodes.map(node => <span key={node.vm_id} className={`rounded-full border px-3 py-1 font-mono text-[10px] ${isVMConnected(node) ? 'border-emerald-500/30 text-emerald-300' : 'border-amber-500/30 text-amber-300'}`}>
      {node.role === 'ATTACKER' ? 'Attacker' : 'Victim'} · {node.ip_address} · {node.status.replace(/_/g, ' ')}
    </span>)}
    {error && <span role="alert" className="text-amber-300">VM status unavailable; retrying.</span>}
    <Link to="/virtual-lab" className="text-cyan-300 hover:underline ml-auto">View lab</Link>
  </section>
}
