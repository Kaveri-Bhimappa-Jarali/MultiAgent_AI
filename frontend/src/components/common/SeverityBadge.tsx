import React from 'react';

interface SeverityBadgeProps {
  severity: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = 'md' }) => {
  const sev = (severity || 'INFO').toUpperCase();

  const colorStyles: Record<string, { badge: string; dot: string }> = {
    CRITICAL: {
      badge: 'bg-rose-950/40 text-rose-300 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.15)]',
      dot: 'bg-rose-400 shadow-[0_0_6px_#f43f5e]',
    },
    HIGH: {
      badge: 'bg-amber-950/40 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.15)]',
      dot: 'bg-amber-400 shadow-[0_0_6px_#f59e0b]',
    },
    MEDIUM: {
      badge: 'bg-yellow-950/40 text-yellow-300 border-yellow-500/40',
      dot: 'bg-yellow-400',
    },
    LOW: {
      badge: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.15)]',
      dot: 'bg-emerald-400 shadow-[0_0_6px_#10b981]',
    },
    INFO: {
      badge: 'bg-purple-950/50 text-purple-300 border-purple-500/40 shadow-[0_0_8px_rgba(168,85,247,0.15)]',
      dot: 'bg-purple-400 shadow-[0_0_6px_#a855f7]',
    },
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  };

  const style = colorStyles[sev] || colorStyles.INFO;

  return (
    <span className={`inline-flex items-center justify-center font-mono uppercase tracking-wider rounded-md border font-medium ${style.badge} ${sizeStyles[size]}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${style.dot}`} />
      {sev}
    </span>
  );
};
