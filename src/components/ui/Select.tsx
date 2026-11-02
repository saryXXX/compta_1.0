/**
 * Reusable Select Dropdown Component with Sharp Edges.
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1">
      {label ? (
        <label htmlFor={selectId} className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider select-none">
          {label}
        </label>
      ) : undefined}
      <div className="relative">
        <select
          id={selectId}
          className={`appearance-none block w-full rounded-md border text-xs sm:text-sm transition-colors pl-3 pr-8 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 focus:border-slate-900 shadow-xs ${
            error ? 'border-rose-500 focus:ring-rose-500' : ''
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
          <ChevronDown className="size-3.5" />
        </div>
      </div>
      {error ? <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{error}</p> : undefined}
    </div>
  );
};
