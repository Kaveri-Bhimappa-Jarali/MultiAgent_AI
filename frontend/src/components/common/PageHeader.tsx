import React from 'react';
import { TermTooltip } from './TermTooltip';
import { ArrowRight, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  badge?: string;
  badgeVariant?: 'royal' | 'emerald' | 'gold' | 'rose';
  description: string;
  workflowStep?: {
    stepNumber: number;
    totalSteps: number;
    stepName: string;
    nextRoute?: string;
    nextLabel?: string;
  };
  terms?: string[];
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  badge,
  badgeVariant = 'royal',
  description,
  workflowStep,
  terms,
  actions
}) => {
  const navigate = useNavigate();

  const badgeStyles = {
    royal: 'bg-royal/20 text-royal-200 border-royal/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    gold: 'bg-gold/15 text-gold border-gold/40',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30'
  }[badgeVariant];

  return (
    <div className="p-5 rounded-2xl bg-navy-850 border border-navy-700/80 shadow-xl mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-3 border-b border-navy-700/60 gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-softwhite">{title}</h1>
            {badge && (
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono font-semibold border ${badgeStyles}`}>
                {badge}
              </span>
            )}
            {workflowStep && (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-navy-800 text-gold border border-gold/30 font-mono font-medium">
                Step {workflowStep.stepNumber} of {workflowStep.totalSteps}: {workflowStep.stepName}
              </span>
            )}
          </div>
          <p className="text-xs text-mutedslate mt-1.5 max-w-3xl leading-relaxed">
            {description}
          </p>
        </div>

        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </div>

      {/* Helpful Terms & Next Step Footer */}
      {(terms?.length || workflowStep?.nextRoute) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 gap-2 text-xs">
          {terms && terms.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono flex items-center space-x-1">
                <Info className="w-3.5 h-3.5 text-royal-300 inline" />
                <span>Key Terms:</span>
              </span>
              {terms.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-lg bg-navy-950/80 border border-slate-700/60 text-[11px]"
                >
                  <TermTooltip term={t} />
                </span>
              ))}
            </div>
          ) : (
            <div />
          )}

          {workflowStep?.nextRoute && (
            <button
              onClick={() => navigate(workflowStep.nextRoute!)}
              className="text-xs text-royal-300 hover:text-softwhite font-mono flex items-center space-x-1 self-start sm:self-auto transition"
            >
              <span>Next Step: {workflowStep.nextLabel || 'Continue Workflow'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
