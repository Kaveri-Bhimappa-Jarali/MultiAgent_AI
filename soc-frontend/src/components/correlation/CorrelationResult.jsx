import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { GitMerge, BrainCircuit, ShieldAlert, Cpu, CheckCircle } from 'lucide-react'

export function CorrelationResult({ incident }) {
  const navigate = useNavigate()

  if (!incident) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 bg-[#0d121c] border border-[#1e2736] shadow-xl space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#182130] pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
            <GitMerge className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Correlation Result Panel
            </h3>
            <div className="text-[10px] text-slate-400 font-mono">Clustered Graph Evidence</div>
          </div>
        </div>

        <Badge type="correlated" size="xs">
          Clustered
        </Badge>
      </div>

      {/* Main Incident Card */}
      <div className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736] space-y-3">
        <div className="text-[11px] font-bold uppercase tracking-widest text-cyan-400">
          Correlated Incident
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-[#182130]">
            <span className="text-slate-400">Incident ID:</span>
            <span className="font-mono font-bold text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/40">
              {incident.id}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-[#182130]">
            <span className="text-slate-400">Related Events:</span>
            <span className="font-mono font-bold text-white">
              {incident.relatedEventsCount} Linked Telemetry Nodes
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-[#182130]">
            <span className="text-slate-400">Attack Pattern:</span>
            <span className="font-semibold text-rose-300 text-right">
              {incident.title}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-[#182130]">
            <span className="text-slate-400">Source IP:</span>
            <span className="font-mono text-cyan-300 font-bold">{incident.sourceIp}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-[#182130]">
            <span className="text-slate-400">Correlation Confidence:</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1 font-mono">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{incident.correlationConfidence}%</span>
            </span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-slate-400">Status:</span>
            <span className="text-purple-300 font-semibold">
              Ready for AI Analysis
            </span>
          </div>
        </div>
      </div>

      {/* Engine Diagnostics Pill */}
      <div className="p-3 rounded-lg bg-[#080c14] border border-[#1c2536] text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
          <span>Correlation Reasoning</span>
        </div>
        <p className="leading-relaxed">
          Aggregated 4 events occurring within a 47-second temporal window originating from subnet host <strong className="text-slate-200">192.168.1.45</strong>. High cross-protocol velocity confirms non-random automated script execution.
        </p>
      </div>

      {/* Action Button */}
      <Button
        variant="primary"
        size="md"
        className="w-full flex items-center justify-center gap-2 text-sm font-bold shadow-[0_0_20px_rgba(168,85,247,0.4)]"
        onClick={() => navigate('/ai-analysis', { state: { incidentId: incident.id } })}
      >
        <BrainCircuit className="w-4 h-4" />
        <span>Analyze Using LLM</span>
      </Button>
    </motion.div>
  )
}
