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
  const accentColors: Record<string, string> = {
    default: '#94A3B8',
    danger:  '#F05265',
    warning: '#F4B942',
    success: '#2DBE85',
    royal:   '#6D5AE6',
    gold:    '#D8B875',
  };
  const color = accentColors[variant] ?? accentColors.default;

  const topBarStyles: Record<string, string> = {
    default: 'from-transparent via-slate-600/60 to-transparent',
    danger:  'from-transparent via-soccritical/70 to-transparent',
    warning: 'from-transparent via-socwarning/70 to-transparent',
    success: 'from-transparent via-socsuccess/70 to-transparent',
    royal:   'from-transparent via-royal/70 to-transparent',
    gold:    'from-transparent via-gold/70 to-transparent',
  };

  const borderStyles: Record<string, string> = {
    default: 'border-navy-700/80 hover:border-slate-600',
    danger:  'border-soccritical/30 hover:border-soccritical/60',
    warning: 'border-socwarning/30 hover:border-socwarning/60',
    success: 'border-socsuccess/30 hover:border-socsuccess/60',
    royal:   'border-royal/40 hover:border-royal shadow-glow-royal',
    gold:    'border-gold/30 hover:border-gold/60',
  };

  const iconBgStyles: Record<string, string> = {
    default: 'bg-navy-700/80 text-mutedslate',
    danger:  'bg-red-500/15 text-soccritical',
    warning: 'bg-amber-500/15 text-socwarning',
    success: 'bg-emerald-500/15 text-socsuccess',
    royal:   'bg-royal/20 text-royal-200',
    gold:    'bg-gold/15 text-gold',
  };

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-navy-800 rounded-2xl p-5 border transition-all duration-200 shadow-lg flex flex-col justify-between ${borderStyles[variant]} ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
    >
      {/* Top colour bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${topBarStyles[variant]}`}
      />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mutedslate mb-1 flex items-center gap-1.5">
            {title}
          </p>
          <h3 className="text-2xl font-black font-mono tracking-tight text-softwhite">{value}</h3>
          {subtitle && <p className="text-xs text-mutedslate mt-1.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${iconBgStyles[variant]}`}>
          {icon}
        </div>
      </div>

      {trend && (
        <div
          className="mt-3 pt-3 border-t border-navy-700/60 flex items-center justify-between text-xs"
        >
          <span className="text-mutedslate">{trend}</span>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        </div>
      )}
    </div>
  );
};
