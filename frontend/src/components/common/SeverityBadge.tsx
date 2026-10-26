import React from 'react';

interface SeverityBadgeProps {
  severity: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = 'md' }) => {
  const sev = (severity || 'INFO').toUpperCase();

  const colorStyles: Record<string, string> = {
    CRITICAL: 'bg-red-500/15 text-soccritical border-soccritical/30',
    HIGH: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    MEDIUM: 'bg-amber-500/15 text-socwarning border-socwarning/30',
    LOW: 'bg-emerald-500/15 text-socsuccess border-socsuccess/30',
    INFO: 'bg-royal/15 text-royal-200 border-royal/30',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  };

  const style = colorStyles[sev] || colorStyles.INFO;

  return (
    <span className={`inline-flex items-center justify-center font-mono uppercase tracking-wider rounded-md border font-medium ${style} ${sizeStyles[size]}`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {sev}
    </span>
  );
};
