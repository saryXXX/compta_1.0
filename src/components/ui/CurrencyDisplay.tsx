/**
 * Currency Display Component: Formats Dinars & Millimes with 3 decimal places.
 * Example: 12500.5 => "12 500,500 TND"
 * Tabular figures for alignment in financial columns and ledgers.
 * 
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React from 'react';

export interface CurrencyDisplayProps {
  amount: number;
  currency?: string;
  className?: string;
  showSign?: boolean;
  variant?: 'neutral' | 'success' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hideCurrency?: boolean;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  currency = 'TND',
  className = '',
  showSign = false,
  variant = 'neutral',
  size = 'md',
  hideCurrency = false,
}) => {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const parts = absAmount.toFixed(3).split('.');
  const integerPart = (parts[0] || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const decimalPart = parts[1] || '000';

  const sign = isNegative ? '- ' : showSign && amount > 0 ? '+ ' : '';

  const variantColors = {
    neutral: 'text-slate-900 dark:text-slate-100',
    success: 'text-emerald-600 dark:text-emerald-400',
    danger: 'text-rose-600 dark:text-rose-400',
    warning: 'text-amber-600 dark:text-amber-400',
  };

  const sizeStyles = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg font-bold',
    xl: 'text-2xl font-black tracking-tight',
  };

  return (
    <span className={`inline-flex items-baseline font-mono tabular-nums ${variantColors[variant]} ${sizeStyles[size]} ${className}`}>
      {sign && <span className="mr-0.5 font-semibold select-none">{sign}</span>}
      <span className="font-semibold">{integerPart}</span>
      <span className="text-[0.88em] opacity-75 font-normal">,{decimalPart}</span>
      {!hideCurrency && (
        <span className="ml-1 text-[0.75em] font-sans font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none">
          {currency}
        </span>
      )}
    </span>
  );
};
