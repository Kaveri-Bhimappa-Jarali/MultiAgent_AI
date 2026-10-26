import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'royal' | 'gold';
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  onClick
}) => {
  const borderStyles: Record<string, string> = {
    default: 'border-slate-800 hover:border-slate-700',
    danger: 'border-soccritical/30 hover:border-soccritical/50 shadow-red-950/20',
    warning: 'border-socwarning/30 hover:border-socwarning/50 shadow-amber-950/20',
    success: 'border-socsuccess/30 hover:border-socsuccess/50 shadow-emerald-950/20',
    royal: 'border-royal/40 hover:border-royal shadow-royal/10',
    gold: 'border-gold/30 hover:border-gold/60 shadow-amber-950/10',
  };

  const iconBgStyles: Record<string, string> = {
    default: 'bg-navy-700/80 text-mutedslate',
    danger: 'bg-red-500/15 text-soccritical',
    warning: 'bg-amber-500/15 text-socwarning',
    success: 'bg-emerald-500/15 text-socsuccess',
    royal: 'bg-royal/20 text-royal-200',
    gold: 'bg-gold/15 text-gold',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-navy-800 rounded-xl p-5 border transition-all duration-200 shadow-lg ${borderStyles[variant]} ${
        onClick ? 'cursor-pointer transform hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-mutedslate mb-1">{title}</p>
          <h3 className="text-2xl font-bold font-mono tracking-tight text-softwhite">{value}</h3>
          {subtitle && <p className="text-xs text-mutedslate mt-1.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${iconBgStyles[variant]}`}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-navy-700/60 flex items-center text-xs text-mutedslate">
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};
