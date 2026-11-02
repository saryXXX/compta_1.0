/**
 * Reusable Badge Component with Sharp Corners and Clean Contrast.
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'vat' | 'outline';
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  className = '',
}) => {
  const sizeStyles = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-1',
    sm: 'px-2 py-0.5 text-[11px] gap-1.5 font-semibold',
    md: 'px-2.5 py-1 text-xs font-semibold gap-1.5',
  };

  const variantStyles = {
    success: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
    danger: 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800',
    info: 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-800',
    neutral: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700',
    vat: 'bg-red-50 text-tn-carmin-primary dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-900',
    outline: 'bg-transparent text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700',
  };

  const dotColors = {
    success: 'bg-emerald-600',
    warning: 'bg-amber-600',
    danger: 'bg-rose-600',
    info: 'bg-sky-600',
    neutral: 'bg-slate-500',
    vat: 'bg-tn-carmin-primary',
    outline: 'bg-slate-500',
  };

  return (
    <span className={`inline-flex items-center rounded font-mono leading-none select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {dot && (
        <span className={`size-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />
      )}
      <span>{children}</span>
    </span>
  );
};
