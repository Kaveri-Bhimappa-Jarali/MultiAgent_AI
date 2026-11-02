import React from 'react'

export function Badge({ type, size = 'sm', children }) {
  const norm = (type || children || '').toString().toLowerCase().trim()

  let classes = 'bg-slate-800 text-slate-300 border-slate-700'
  let dotColor = 'bg-slate-400'

  if (norm.includes('very high') || norm === 'critical' || norm === 'block') {
    classes = 'bg-rose-950/40 text-rose-300 border-rose-500/40'
    dotColor = 'bg-rose-400'
  } else if (norm.includes('high') || norm === 'investigate') {
    classes = 'bg-amber-950/40 text-amber-300 border-amber-500/40'
    dotColor = 'bg-amber-400'
  } else if (norm.includes('medium') || norm === 'monitor') {
    classes = 'bg-yellow-950/40 text-yellow-300 border-yellow-500/40'
    dotColor = 'bg-yellow-400'
  } else if (norm.includes('low') || norm === 'allow' || norm === 'resolved' || norm === 'secure') {
    classes = 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
    dotColor = 'bg-emerald-400'
  } else if (norm === 'correlated' || norm === 'analyzed') {
    classes = 'bg-purple-950/50 text-purple-300 border-purple-500/40 shadow-[0_0_8px_rgba(168,85,247,0.15)]'
    dotColor = 'bg-purple-400'
  } else if (norm === 'new' || norm === 'pending') {
    classes = 'bg-cyan-950/40 text-cyan-300 border-cyan-500/40'
    dotColor = 'bg-cyan-400'
  }

  const sizeClass = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md font-medium border ${classes} ${sizeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{children || type}</span>
    </span>
  )
}
