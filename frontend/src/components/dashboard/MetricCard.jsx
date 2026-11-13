import React from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'

export function MetricCard({
  icon: Icon,
  emoji,
  title,
  value,
  subtitle,
  trend,
  color = '#a855f7',
  chartData = []
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="rounded-2xl p-4 bg-[#0d121c] border border-[#1e2736] hover:border-purple-500/40 transition-colors shadow-lg relative overflow-hidden flex flex-col justify-between"
    >
      {/* Top ambient color bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-75"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`
        }}
      />

      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            {emoji && <span className="text-sm">{emoji}</span>}
            {Icon && <Icon className="w-3.5 h-3.5" style={{ color }} />}
            <span>{title}</span>
          </div>
          <div className="text-2xl font-black text-white mt-1 tracking-tight">
            {value}
          </div>
        </div>

        {trend && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
            style={{
              color,
              borderColor: `${color}40`,
              backgroundColor: `${color}15`,
            }}
          >
            {trend}
          </span>
        )}
      </div>

      {/* Mini Trend Sparkline */}
      <div className="h-10 w-full mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`spark-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-[#0b0e17] border border-[#1e2736] px-2 py-0.5 rounded text-[10px] text-white">
                      {payload[0].value}
                    </div>
                  )
                }
                return null
              }}
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1.8}
              fill={`url(#spark-${title})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="text-[11px] text-slate-400 font-medium mt-2 pt-2 border-t border-[#182130] flex items-center justify-between">
        <span>{subtitle}</span>
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      </div>
    </motion.div>
  )
}
