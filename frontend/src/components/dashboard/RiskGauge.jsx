import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, AlertTriangle } from 'lucide-react'

const TOTAL_SEGMENTS = 28
const SEGMENT_GAP = 2.4

function polarToXY(angleDeg, r, cx, cy) {
  const rad = ((angleDeg - 180) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function makeSegmentPath(index, total, innerR, outerR, cx, cy) {
  const totalAngle = 180
  const step = totalAngle / total
  const startDeg = index * step + SEGMENT_GAP / 2
  const endDeg = (index + 1) * step - SEGMENT_GAP / 2

  const p1 = polarToXY(startDeg, innerR, cx, cy)
  const p2 = polarToXY(startDeg, outerR, cx, cy)
  const p3 = polarToXY(endDeg, outerR, cx, cy)
  const p4 = polarToXY(endDeg, innerR, cx, cy)

  return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${outerR} ${outerR} 0 0 1 ${p3.x} ${p3.y} L ${p4.x} ${p4.y} A ${innerR} ${innerR} 0 0 0 ${p1.x} ${p1.y} Z`
}

export function RiskGauge({ score = 72 }) {
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    let current = 0
    const step = Math.ceil(score / 35)
    const timer = setInterval(() => {
      current += step
      if (current >= score) {
        setAnimatedScore(score)
        clearInterval(timer)
      } else {
        setAnimatedScore(current)
      }
    }, 20)
    return () => clearInterval(timer)
  }, [score])

  const filledCount = Math.round((animatedScore / 100) * TOTAL_SEGMENTS)

  // Interpolate color from purple to magenta to orange/red
  const getSegmentColor = (idx) => {
    const ratio = idx / TOTAL_SEGMENTS
    if (ratio < 0.4) return '#8b5cf6' // purple
    if (ratio < 0.75) return '#d946ef' // magenta
    if (ratio < 0.88) return '#f97316' // orange
    return '#ef4444' // red
  }

  const cx = 110
  const cy = 100
  const innerR = 64
  const outerR = 86

  return (
    <div className="rounded-2xl p-5 bg-[#0d121c] border border-[#1e2736] shadow-xl relative overflow-hidden flex flex-col justify-between h-full">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#182130] pb-3 mb-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Overall Security Risk
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950/50 border border-rose-500/40 text-rose-300 uppercase">
          High Risk
        </span>
      </div>

      {/* Semi-circular Segment Gauge */}
      <div className="relative flex flex-col items-center justify-center my-auto py-2">
        <svg viewBox="0 0 220 120" className="w-56 h-auto drop-shadow-[0_0_20px_rgba(168,85,247,0.25)]">
          <defs>
            <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Segment Arcs */}
          {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => {
            const isFilled = i < filledCount
            const color = getSegmentColor(i)
            const isLatest = i === filledCount - 1 && isFilled

            return (
              <path
                key={i}
                d={makeSegmentPath(i, TOTAL_SEGMENTS, innerR, outerR, cx, cy)}
                fill={isFilled ? color : '#1a2233'}
                filter={isLatest ? 'url(#gaugeGlow)' : 'none'}
                opacity={isFilled ? 1 : 0.4}
                className="transition-all duration-300"
              />
            )
          })}
        </svg>

        {/* Center Score Overlay */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center pointer-events-none">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-300 to-rose-300"
          >
            {animatedScore}%
          </motion.div>
          <div className="text-[11px] font-bold tracking-widest text-rose-400 uppercase mt-0.5 flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>High Risk Zone</span>
          </div>
        </div>
      </div>

      {/* Sub-breakdown metrics */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#182130] text-xs">
        <div className="bg-[#090d16] p-2.5 rounded-lg border border-[#1e2736]">
          <div className="text-[10px] text-slate-400">Attack Velocity</div>
          <div className="text-sm font-bold text-white mt-0.5">High (+14/h)</div>
        </div>
        <div className="bg-[#090d16] p-2.5 rounded-lg border border-[#1e2736]">
          <div className="text-[10px] text-slate-400">Asset Exposure</div>
          <div className="text-sm font-bold text-amber-300 mt-0.5">8 Vulnerable</div>
        </div>
      </div>
    </div>
  )
}
