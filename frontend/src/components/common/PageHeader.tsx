import React from 'react';

interface PageHeaderProps {
  title: string;
  badge?: string;
  badgeVariant?: 'royal' | 'emerald' | 'gold' | 'rose' | 'slate';
  description?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  badge,
  badgeVariant = 'royal',
  description,
  actions
}) => {
  const badgeStyles = {
    royal: 'bg-royal/15 text-royal-200 border-royal/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    gold: 'bg-gold/15 text-gold border-gold/40',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    slate: 'bg-navy-800 text-slate-300 border-slate-700'
  }[badgeVariant];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-5 border-b border-navy-800 gap-3">
      <div>
        <div className="flex items-center space-x-2.5">
          <h1 className="text-xl font-bold tracking-tight text-softwhite font-mono uppercase">
            {title}
          </h1>
          {badge && (
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-semibold border ${badgeStyles}`}>
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-mutedslate mt-0.5 max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {actions}
        </div>
      )}
    </div>
  );
};
