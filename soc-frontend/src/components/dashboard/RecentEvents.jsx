import React from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { ArrowUpRight, GitMerge, BrainCircuit, ShieldAlert } from 'lucide-react'

export function RecentEvents({ events = [] }) {
  const displayEvents = events.slice(0, 7)

  return (
    <div className="rounded-2xl p-5 bg-[#0d121c] border border-[#1e2736] shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-purple-500/20 text-purple-400">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Recent Security Events & Automated Triage
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Streaming event telemetry categorized and mapped to the correlation & LLM layer
          </p>
        </div>

        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
        >
          <span>View All Events</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#1c2536] text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-[#090d16]/50">
              <th className="py-2.5 px-3">Event ID</th>
              <th className="py-2.5 px-3">Event Type</th>
              <th className="py-2.5 px-3">Source</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Correlation</th>
              <th className="py-2.5 px-3">LLM Status</th>
              <th className="py-2.5 px-3">Severity</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#182130]">
            {displayEvents.map(evt => (
              <tr
                key={evt.id}
                className="hover:bg-[#111827]/70 transition-colors duration-150 group"
              >
                <td className="py-3 px-3 font-mono font-semibold text-purple-300">
                  {evt.id}
                </td>
                <td className="py-3 px-3 font-medium text-white">
                  {evt.type}
                </td>
                <td className="py-3 px-3 font-mono text-slate-400">
                  {evt.source}
                </td>
                <td className="py-3 px-3 text-slate-300">
                  <span className="px-2 py-0.5 rounded bg-[#162032] border border-[#23314d] text-[11px]">
                    {evt.category}
                  </span>
                </td>
                <td className="py-3 px-3">
                  {evt.correlationId ? (
                    <Link
                      to="/correlation"
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-cyan-400 hover:text-cyan-300"
                    >
                      <GitMerge className="w-3 h-3" />
                      <span>{evt.correlationId}</span>
                    </Link>
                  ) : (
                    <span className="text-[11px] text-slate-500">Standalone</span>
                  )}
                </td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 text-[11px] text-purple-300">
                    <BrainCircuit className="w-3 h-3" />
                    <span>{evt.llmStatus}</span>
                  </span>
                </td>
                <td className="py-3 px-3">
                  <Badge type={evt.severity} size="xs" />
                </td>
                <td className="py-3 px-3 text-right">
                  <Badge type={evt.action} size="xs" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
