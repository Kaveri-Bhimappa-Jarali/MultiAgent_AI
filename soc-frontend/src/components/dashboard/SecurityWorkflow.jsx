import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { workflowStages as defaultWorkflowStages } from '../../data/mockSecurityData'
import { ArrowRight, ChevronRight, Activity, Zap } from 'lucide-react'

export function SecurityWorkflow({ stages = null, activeStep = null, onSelectStep = null }) {
  const navigate = useNavigate()
  // Use real stages from prop when available, otherwise fall back to static mock shapes
  const workflowStages = stages || defaultWorkflowStages

  const handleStepClick = (stage) => {
    if (onSelectStep) {
      onSelectStep(stage)
      return
    }

    if (stage.id === 'events') navigate('/events')
    else if (stage.id === 'correlation') navigate('/correlation')
    else if (stage.id === 'llm' || stage.id === 'severity') navigate('/ai-analysis')
    else if (stage.id === 'action') navigate('/ai-analysis')
  }

  return (
    <div className="rounded-2xl p-5 bg-[#0d121c] border border-[#1e2736] shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-5 border-b border-[#182130]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-purple-500/20 text-purple-300">
              <Zap className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              End-to-End SOC Intelligence Pipeline
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Event Ingest & Normalization → Correlation Engine → LLM Threat Reasoning → Severity → Automated Response
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-400 font-semibold font-mono">PIPELINE ACTIVE</span>
        </div>
      </div>

      {/* Horizontal Pipeline on Desktop / Stacked on Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
        {workflowStages.map((stage, index) => {
          const isLast = index === workflowStages.length - 1
          const isSelected = activeStep === stage.id

          return (
            <div key={stage.id} className="relative flex items-center">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStepClick(stage)}
                className={`w-full p-4 rounded-xl cursor-pointer border transition-all duration-200 relative group ${
                  isSelected
                    ? 'bg-purple-950/40 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.35)]'
                    : 'bg-[#090d16] border-[#1e2736] hover:border-purple-500/50 hover:bg-[#111726]'
                }`}
              >
                {/* Step indicator badge */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-purple-400 font-bold px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/40">
                    STEP 0{index + 1}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    {stage.status}
                  </span>
                </div>

                {/* Stage Icon & Label */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xl">{stage.icon}</span>
                  <div className="font-bold text-white text-xs truncate group-hover:text-purple-300 transition-colors">
                    {stage.label}
                  </div>
                </div>

                {/* Metric Count */}
                <div className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-300 to-white">
                  {stage.count}
                </div>

                {/* Subtitle description */}
                <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                  {stage.desc}
                </div>
              </motion.div>

              {/* Connecting animated arrow for desktop */}
              {!isLast && (
                <div className="hidden md:flex absolute -right-3.5 z-10 w-6 h-6 rounded-full bg-[#111827] border border-[#2d3748] items-center justify-center text-purple-400 shadow-md">
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Decision Engine Visual Flow Indicator */}
      <div className="mt-4 pt-3 border-t border-[#182130] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <span className="font-semibold text-slate-300">Automated Triage Matrix:</span>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
            <span>🟢 LOW</span> <span>→ ALLOW</span>
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-yellow-950/40 text-yellow-300 border border-yellow-500/30">
            <span>🟡 MEDIUM</span> <span>→ MONITOR</span>
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/30">
            <span>🟠 HIGH</span> <span>→ INVESTIGATE</span>
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
            <span>🔴 VERY HIGH</span> <span>→ BLOCK</span>
          </span>
        </div>
      </div>
    </div>
  )
}
