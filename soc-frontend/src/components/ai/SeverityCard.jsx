import React from 'react'
import { motion } from 'framer-motion'
import { AlertOctagon, ShieldAlert, Zap } from 'lucide-react'

const SEVERITY_LEVELS = [
  { level: 'LOW', label: '🟢 LOW', desc: 'Routine or benign activity', range: '0 - 39', color: '#10b981' },
  { level: 'MEDIUM', label: '🟡 MEDIUM', desc: 'Suspicious anomaly', range: '40 - 69', color: '#eab308' },
  { level: 'HIGH', label: '🟠 HIGH', desc: 'Confirmed targeted threat', range: '70 - 84', color: '#f97316' },
  { level: 'VERY HIGH', label: '🔴 VERY HIGH', desc: 'Critical breach / immediate harm', range: '85 - 100', color: '#ef4444' },
]

export function SeverityCard({ incident }) {
  const currentSeverity = (incident?.severity || 'VERY HIGH').toUpperCase()
  const riskScore = incident?.riskScore || 87

  // Calculate filled segments for score
  const totalSegments = 24
  const filled = Math.round((riskScore / 100) * totalSegments)

  return (
    <div className="rounded-2xl p-6 bg-[#0d121c] border border-[#1e2736] shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#182130]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-rose-500/20 text-rose-400">
              <AlertOctagon className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Severity Classification & Danger Scoring
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Composite severity index calculated from asset criticality, attack velocity, and exploit impact
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold uppercase">Current Severity:</span>
          <span className="px-3 py-1 rounded-lg text-xs font-black tracking-wider bg-rose-950/60 border border-rose-500/60 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
            🔴 {currentSeverity}
          </span>
        </div>
      </div>

      {/* Main Grid: 4 Severity Cards + Risk Score Dial */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        {/* 4 Levels Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SEVERITY_LEVELS.map(s => {
            const isSelected = currentSeverity === s.level

            return (
              <motion.div
                key={s.level}
                whileHover={{ scale: 1.02 }}
                className={`p-4 rounded-xl border transition-all duration-200 relative ${
                  isSelected
                    ? 'bg-gradient-to-br from-rose-950/50 via-purple-950/30 to-[#0c1018] border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.35)]'
                    : 'bg-[#090d16] border-[#1e2736] opacity-65 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-black text-white">{s.label}</span>
                  <span className="text-[10px] font-mono font-bold text-slate-400 px-1.5 py-0.5 rounded bg-[#162030]">
                    Score {s.range}
                  </span>
                </div>

                <p className="text-xs text-slate-400">{s.desc}</p>

                {isSelected && (
                  <div className="mt-3 pt-2 border-t border-rose-500/30 flex items-center justify-between text-[11px] font-bold text-rose-300">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-rose-400 animate-pulse" />
                      <span>Active Classification</span>
                    </span>
                    <span className="font-mono">{riskScore} / 100</span>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Risk Score Visual Gauge Card */}
        <div className="p-5 rounded-xl bg-[#090d16] border border-[#1e2736] flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-2">
            Calculated Risk Score
          </div>

          {/* Segmented Circular Ring */}
          <div className="relative w-36 h-36 flex items-center justify-center my-2">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              {Array.from({ length: totalSegments }).map((_, i) => {
                const angle = (i * 360) / totalSegments
                const isLit = i < filled
                const strokeColor = i > totalSegments * 0.75 ? '#ef4444' : i > totalSegments * 0.5 ? '#f97316' : '#8b5cf6'

                return (
                  <circle
                    key={i}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={isLit ? strokeColor : '#1e2736'}
                    strokeWidth="7"
                    strokeDasharray="4 6"
                    strokeDashoffset={-((i * (2 * Math.PI * 40)) / totalSegments)}
                    className="transition-all duration-300"
                  />
                )
              })}
            </svg>

            {/* Score Text Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-white font-mono">{riskScore}</span>
              <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">/ 100</span>
            </div>
          </div>

          <div className="mt-2 text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Severe Threat Index</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Immediate remediation recommended
          </div>
        </div>
      </div>
    </div>
  )
}
