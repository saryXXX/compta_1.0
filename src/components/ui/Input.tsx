/**
 * Reusable Accessible Input Component with Sharp, Professional Edges.
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  rightAction?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  rightAction,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1">
      {label ? (
        <label htmlFor={inputId} className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider select-none">
          {label}
        </label>
      ) : undefined}
      <div className="relative rounded-md shadow-xs">
        {leftIcon ? (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {leftIcon}
          </div>
        ) : undefined}
        <input
          id={inputId}
          className={`block w-full rounded-md border text-xs sm:text-sm transition-colors py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 ${
            leftIcon ? 'pl-9' : 'pl-3'
          } ${rightAction || rightIcon ? 'pr-10' : 'pr-3'} ${
            error
              ? 'border-rose-500 dark:border-rose-500 focus:ring-rose-500 focus:border-rose-500'
              : 'border-slate-300 dark:border-slate-700 focus:ring-slate-900 dark:focus:ring-slate-300 focus:border-slate-900 dark:focus:border-slate-300'
          } ${className}`}
          {...props}
        />
        {rightAction ? (
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
            {rightAction}
          </div>
        ) : rightIcon ? (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            {rightIcon}
          </div>
        ) : undefined}
      </div>
      {error ? (
        <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{helperText}</p>
      ) : undefined}
    </div>
  );
};
