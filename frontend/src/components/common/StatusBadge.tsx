import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const st = (status || 'UNKNOWN').toUpperCase();

  const styles: Record<string, string> = {
    // Incident statuses
    NEW: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/40',
    INVESTIGATING: 'bg-purple-950/50 text-purple-300 border-purple-500/40 shadow-[0_0_8px_rgba(168,85,247,0.15)]',
    CONTAINED: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40',
    RESOLVED: 'bg-slate-800 text-slate-300 border-slate-700',
    FALSE_POSITIVE: 'bg-zinc-800/80 text-zinc-400 border-zinc-700',

    // Response statuses
    RECOMMENDED: 'bg-amber-950/40 text-amber-300 border-amber-500/40',
    PENDING_APPROVAL: 'bg-amber-950/60 text-amber-300 border-amber-400/50 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.2)]',
    APPROVED: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/40',
    SIMULATED: 'bg-purple-950/40 text-purple-200 border-purple-400/40',
    EXECUTED: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40',
    PENDING_VERIFICATION: 'bg-amber-950/40 text-amber-300 border-amber-500/40',
    VERIFIED: 'bg-emerald-950/50 text-emerald-300 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.2)]',
    FAILED: 'bg-rose-950/50 text-rose-300 border-rose-500/50',
    REJECTED: 'bg-rose-950/40 text-rose-300 border-rose-500/40',

    // Verification statuses
    VERIFIED_CONTAINED: 'bg-emerald-950/50 text-emerald-300 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.2)]',
    VERIFICATION_FAILED: 'bg-rose-950/50 text-rose-300 border-rose-500/50',
    INCONCLUSIVE: 'bg-slate-800 text-slate-400 border-slate-700',
    VERIFICATION_IN_PROGRESS: 'bg-blue-950/40 text-blue-300 border-blue-400/40 animate-pulse',

    // Agent statuses
    RUNNING: 'bg-purple-950/60 text-purple-200 border-purple-500 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.25)]',
    COMPLETED: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40',
    IDLE: 'bg-slate-800 text-slate-400 border-slate-700',
  };

  const style = styles[st] || 'bg-slate-800 text-slate-400 border-slate-700';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {st.replace(/_/g, ' ')}
    </span>
  );
};
