import React from 'react'
import { motion } from 'framer-motion'
import { BrainCircuit, Search, Eye, Sparkles, ShieldAlert, Cpu } from 'lucide-react'

export function LLMAnalysis({ incident }) {
  if (!incident) return null

  return (
    <div className="rounded-2xl p-6 bg-[#0d121c] border border-[#1e2736] shadow-xl space-y-6">
      {/* Page / Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#182130]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide uppercase">
              LLM Analysis Layer
            </h3>
            <p className="text-xs text-slate-400">
              Natural language threat observation synthesis and autonomous adversary reasoning
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/50 text-purple-300 text-xs font-mono font-semibold flex items-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.25)]">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span>Model: Sentinel-SOC-70B-Cyber</span>
          </span>
        </div>
      </div>

      {/* INPUT TO LLM Panel */}
      <div className="p-4 rounded-xl bg-[#090d16] border border-[#1e2736] space-y-3">
        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>Input Context Supplied to LLM Reasoning Engine</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-[#0e1422] border border-[#1c2536]">
            <span className="text-slate-400 text-[10px]">Incident ID</span>
            <div className="font-mono font-bold text-purple-300 mt-0.5">{incident.id}</div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0e1422] border border-[#1c2536]">
            <span className="text-slate-400 text-[10px]">Related Events</span>
            <div className="font-bold text-white mt-0.5">{incident.relatedEventsCount} Correlated Signals</div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0e1422] border border-[#1c2536]">
            <span className="text-slate-400 text-[10px]">Source Target</span>
            <div className="font-mono font-bold text-rose-300 mt-0.5">{incident.sourceIp}</div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0e1422] border border-[#1c2536]">
            <span className="text-slate-400 text-[10px]">Event Categories</span>
            <div className="text-[11px] font-semibold text-slate-200 mt-0.5 truncate">
              {incident.categories?.join(' • ') || 'Auth • Net • Web'}
            </div>
          </div>
        </div>
      </div>

      {/* 🧠 LLM OBSERVATION Panel */}
      <div className="p-5 rounded-xl bg-gradient-to-br from-[#0c101a] to-[#111827] border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
            <Eye className="w-4 h-4 text-purple-400" />
            <span>🧠 LLM Observation</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Semantic Synthesis</span>
        </div>

        <div className="text-xs md:text-sm text-slate-200 leading-relaxed font-sans bg-[#080c14]/60 p-4 rounded-lg border border-[#1e2736]/60">
          <p className="whitespace-pre-line">
            {incident.llmObservation}
          </p>
        </div>
      </div>

      {/* 🔍 LLM CONCLUSION Panel */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-rose-950/30 via-purple-950/30 to-[#0e1320] border border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.2)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
            <Search className="w-4 h-4" />
            <span>🔍 LLM Conclusion</span>
          </div>
          <div className="text-base md:text-lg font-black tracking-wide text-white mt-1 uppercase">
            {incident.llmConclusion}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated verdict generated through contextual kill-chain mapping against MITRE ATT&CK techniques.
          </p>
        </div>

        {/* Confidence badge */}
        <div className="flex-shrink-0 text-center md:text-right bg-[#090d16] px-5 py-3 rounded-xl border border-purple-500/30">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Detection Confidence</div>
          <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 font-mono mt-0.5">
            {incident.llmConfidence}%
          </div>
        </div>
      </div>
    </div>
  )
}
