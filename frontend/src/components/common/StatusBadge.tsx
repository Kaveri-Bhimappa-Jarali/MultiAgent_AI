import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const st = (status || 'UNKNOWN').toUpperCase();

  const styles: Record<string, string> = {
    // Incident statuses
    NEW: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    INVESTIGATING: 'bg-purple-500/15 text-royal-200 border-royal/30',
    CONTAINED: 'bg-emerald-500/15 text-socsuccess border-socsuccess/30',
    RESOLVED: 'bg-slate-500/15 text-mutedslate border-slate-700',
    FALSE_POSITIVE: 'bg-zinc-500/15 text-zinc-400 border-zinc-700',

    // Response statuses
    RECOMMENDED: 'bg-amber-500/15 text-socwarning border-socwarning/30',
    PENDING_APPROVAL: 'bg-amber-500/20 text-amber-300 border-amber-400/40 animate-pulse',
    APPROVED: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    EXECUTED: 'bg-emerald-500/15 text-socsuccess border-socsuccess/30',
    REJECTED: 'bg-red-500/15 text-soccritical border-soccritical/30',

    // Verification statuses
    VERIFIED_CONTAINED: 'bg-emerald-500/20 text-socsuccess border-socsuccess/40',
    VERIFICATION_FAILED: 'bg-red-500/20 text-soccritical border-soccritical/40',
    PENDING_VERIFICATION: 'bg-amber-500/15 text-socwarning border-socwarning/30',
    VERIFICATION_IN_PROGRESS: 'bg-blue-500/20 text-blue-300 border-blue-400/30 animate-pulse',

    // Agent statuses
    RUNNING: 'bg-royal/25 text-royal-100 border-royal animate-pulse',
    COMPLETED: 'bg-emerald-500/15 text-socsuccess border-socsuccess/30',
    IDLE: 'bg-slate-500/15 text-mutedslate border-slate-700',
    FAILED: 'bg-red-500/20 text-soccritical border-soccritical/40',
  };

  const style = styles[st] || 'bg-slate-500/15 text-mutedslate border-slate-700';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${style}`}>
      {st.replace(/_/g, ' ')}
    </span>
  );
};
