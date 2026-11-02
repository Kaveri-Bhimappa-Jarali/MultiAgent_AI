import React, { useState, useMemo } from 'react'
import { Badge } from '../ui/Badge'
import { SearchInput } from '../ui/SearchInput'
import { Button } from '../ui/Button'
import { Filter, RefreshCw, GitMerge, Radio } from 'lucide-react'

const CATEGORIES = ['All', 'Authentication', 'Network', 'Web Attack', 'Endpoint', 'Data Access']
const STATUS_OPTIONS = ['All', 'New', 'Correlated']

export function EventTable({ events = [], selectedEvent = null, onSelectEvent }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  const filteredEvents = useMemo(() => {
    return events.filter(evt => {
      const matchCat = category === 'All' || evt.category === category
      const matchStatus = statusFilter === 'All' || evt.status === statusFilter
      const query = search.toLowerCase()
      const matchSearch =
        evt.id.toLowerCase().includes(query) ||
        evt.type.toLowerCase().includes(query) ||
        evt.source.toLowerCase().includes(query) ||
        evt.destination.toLowerCase().includes(query) ||
        evt.category.toLowerCase().includes(query)

      return matchCat && matchStatus && matchSearch
    })
  }, [events, category, statusFilter, search])

  return (
    <div className="rounded-2xl p-5 bg-[#0d121c] border border-[#1e2736] shadow-xl space-y-4">
      {/* Controls & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="w-full lg:w-80">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by ID, IP, Type, or Destination..."
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1 bg-[#090d16] border border-[#1e2736] p-1 rounded-xl">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  category === cat
                    ? 'bg-purple-600 text-white shadow-[0_0_8px_rgba(168,85,247,0.3)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#090d16] border border-[#1e2736] p-1 rounded-xl">
            {STATUS_OPTIONS.map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  statusFilter === st
                    ? 'bg-cyan-600 text-white shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-xl border border-[#1c2536]">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#1c2536] text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-[#090d16]">
              <th className="py-3 px-3">Event ID</th>
              <th className="py-3 px-3">Timestamp</th>
              <th className="py-3 px-3">Event Type</th>
              <th className="py-3 px-3">Source IP</th>
              <th className="py-3 px-3">Destination</th>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-3">Network Info</th>
              <th className="py-3 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#182130] bg-[#0b0f19]">
            {filteredEvents.map(evt => {
              const isSelected = selectedEvent?.id === evt.id
              return (
                <tr
                  key={evt.id}
                  onClick={() => onSelectEvent(evt)}
                  className={`cursor-pointer transition-colors duration-150 ${
                    isSelected
                      ? 'bg-purple-950/40 border-l-2 border-purple-500'
                      : 'hover:bg-[#121927]'
                  }`}
                >
                  <td className="py-3 px-3 font-mono font-bold text-purple-300">
                    {evt.id}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                    {evt.timeShort || evt.timestamp}
                  </td>
                  <td className="py-3 px-3 font-semibold text-white">
                    {evt.type}
                  </td>
                  <td className="py-3 px-3 font-mono text-rose-300">
                    {evt.source}
                  </td>
                  <td className="py-3 px-3 text-slate-300 truncate max-w-[150px]">
                    {evt.destination}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-[#162032] border border-[#23314d] text-[10px] text-slate-300 font-medium">
                      {evt.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-cyan-300 truncate max-w-[140px]">
                    {evt.networkInfo}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Badge type={evt.status} size="xs" />
                  </td>
                </tr>
              )
            })}

            {filteredEvents.length === 0 && (
              <tr>
                <td colSpan={8} className="py-16 text-center text-slate-500">
                  No security events matching current criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-[#182130]">
        <span>
          Showing <strong>{filteredEvents.length}</strong> of <strong>{events.length}</strong> normalized security events
        </span>
        <span className="text-[11px] font-mono text-purple-400">
          ● Live Syslog Ingestion Pipeline Active
        </span>
      </div>
    </div>
  )
}
