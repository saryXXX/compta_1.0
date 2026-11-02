/**
 * Metric Card Component for Financial Dashboards & Ledgers.
 * Crisp, sharp-edged card architecture with hairline borders and tabular values.
 * 
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React from 'react';

export interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: 'red' | 'blue' | 'emerald' | 'amber' | 'slate';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  description,
  icon,
  trend,
  accentColor = 'slate',
}) => {
  const iconBgs = {
    red: 'bg-red-50 text-tn-carmin-primary dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900',
    blue: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200 dark:border-sky-900',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900',
    slate: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  };

  const effectiveSubtitle = subtitle || description;

  return (
    <div className="rounded-lg bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            {title}
          </p>
          {icon ? (
            <div className={`size-7 rounded flex items-center justify-center shrink-0 ${iconBgs[accentColor]}`}>
              {icon}
            </div>
          ) : undefined}
        </div>

        <div className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
          {value}
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        {effectiveSubtitle ? (
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[190px]">
            {effectiveSubtitle}
          </span>
        ) : <span />}

        {trend ? (
          <span
            className={`inline-flex items-center font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${
              trend.isPositive
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
            }`}
          >
            {trend.isPositive ? '↑ +' : '↓ -'}
            {trend.value}
          </span>
        ) : undefined}
      </div>
    </div>
  );
};
