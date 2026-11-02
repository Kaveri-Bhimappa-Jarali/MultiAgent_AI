import React from 'react'
import { motion } from 'framer-motion'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useNavigate } from 'react-router-dom'
import { GitMerge, BrainCircuit, X, ShieldAlert, Network, UserCheck } from 'lucide-react'

export function EventDetails({ event, onClose }) {
  const navigate = useNavigate()

  if (!event) {
    return (
      <div className="rounded-2xl p-6 bg-[#0d121c] border border-[#1e2736] text-center text-slate-500 text-xs py-20">
        <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-slate-600" />
        <p className="font-semibold text-slate-400">No Event Selected</p>
        <p className="text-[11px] mt-1">Click on any security event from the table to inspect payload telemetry and correlation chains.</p>
      </div>
    )
  }

  const handleSendToCorrelation = () => {
    navigate('/correlation', { state: { targetEventId: event.id } })
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      className="rounded-2xl p-5 bg-[#0d121c] border border-[#1e2736] shadow-xl space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#182130] pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300">
            <ShieldAlert className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Event Details</h3>
            <div className="text-[10px] text-slate-400 font-mono">Raw Ingest Schema v2.1</div>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Primary Key Attributes */}
      <div className="space-y-2.5 text-xs">
        <div className="flex justify-between items-center py-1.5 border-b border-[#161f2e]">
          <span className="text-slate-400 font-medium">Event ID:</span>
          <span className="font-mono font-bold text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/40">
            {event.id}
          </span>
        </div>

        <div className="flex justify-between items-center py-1.5 border-b border-[#161f2e]">
          <span className="text-slate-400 font-medium">Timestamp:</span>
          <span className="text-slate-200 font-mono text-[11px]">{event.timestamp}</span>
        </div>

        <div className="flex justify-between items-center py-1.5 border-b border-[#161f2e]">
          <span className="text-slate-400 font-medium">Event Type:</span>
          <span className="font-semibold text-white">{event.type}</span>
        </div>

        <div className="flex justify-between items-center py-1.5 border-b border-[#161f2e]">
          <span className="text-slate-400 font-medium">Category:</span>
          <span className="px-2 py-0.5 rounded bg-[#162032] border border-[#23314d] text-[11px] text-slate-300">
            {event.category}
          </span>
        </div>

        <div className="flex justify-between items-center py-1.5 border-b border-[#161f2e]">
          <span className="text-slate-400 font-medium">Source IP:</span>
          <span className="font-mono text-rose-300 font-bold">{event.source}</span>
        </div>

        <div className="flex justify-between items-center py-1.5 border-b border-[#161f2e]">
          <span className="text-slate-400 font-medium">Destination:</span>
          <span className="text-slate-300 text-right truncate max-w-[200px]">{event.destination}</span>
        </div>

        <div className="flex justify-between items-center py-1.5 border-b border-[#161f2e]">
          <span className="text-slate-400 font-medium">Status:</span>
          <Badge type={event.status} size="xs" />
        </div>

        <div className="flex justify-between items-center py-1.5 border-b border-[#161f2e]">
          <span className="text-slate-400 font-medium">Severity / Triage:</span>
          <Badge type={event.severity} size="xs" />
        </div>
      </div>

      {/* Network & Authentication Diagnostics */}
      <div className="space-y-3 pt-2">
        <div className="p-3 rounded-xl bg-[#080c14] border border-[#1e2736] space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Network className="w-3.5 h-3.5 text-cyan-400" />
            <span>Network Information</span>
          </div>
          <div className="text-xs font-mono text-cyan-300 break-all">
            {event.networkInfo || 'TCP : 22 (SSH)'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#080c14] border border-[#1e2736] space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Authentication Information</span>
          </div>
          <div className="text-xs font-mono text-purple-200 break-all">
            {event.authInfo || 'User: admin (Authentication Failure)'}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-2 space-y-2">
        <Button
          variant="primary"
          size="sm"
          className="w-full flex items-center justify-center gap-2"
          onClick={handleSendToCorrelation}
        >
          <GitMerge className="w-4 h-4" />
          <span>Send to Correlation Engine</span>
        </Button>

        {event.correlationId && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => navigate('/ai-analysis')}
          >
            <BrainCircuit className="w-4 h-4 text-purple-400" />
            <span>View Correlated LLM Diagnosis</span>
          </Button>
        )}
      </div>
    </motion.div>
  )
}
