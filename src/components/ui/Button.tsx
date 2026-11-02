/**
 * Reusable Button Component with Sharp, Precision Edges.
 * Supports icon, leftIcon, rightIcon and loading states.
 * STRICT POLICY: NO TYPE NULL IN ANY TYPESCRIPT CODE.
 */

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'gold';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-all duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.99] shadow-xs';

  const sizeStyles = {
    xs: 'px-2 py-1 text-[11px] gap-1 font-semibold',
    sm: 'px-2.5 py-1.5 text-xs gap-1.5 font-semibold',
    md: 'px-3.5 py-2 text-xs font-semibold gap-2',
    lg: 'px-4 py-2.5 text-sm font-bold gap-2',
  };

  const variantStyles = {
    primary: 'bg-tn-carmin-primary hover:bg-tn-carmin-hover text-white focus-visible:ring-tn-carmin-primary border border-red-800/40',
    secondary: 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 border border-slate-800 dark:border-slate-300',
    outline: 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white border border-rose-700 focus-visible:ring-rose-500',
    ghost: 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white shadow-none border-transparent',
    gold: 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-700/60 focus-visible:ring-amber-500',
  };

  const displayLeft = leftIcon || icon;

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
      ) : displayLeft ? (
        <span className="shrink-0">{displayLeft}</span>
      ) : undefined}
      {children}
      {rightIcon && !isLoading ? (
        <span className="shrink-0">{rightIcon}</span>
      ) : undefined}
    </button>
  );
};
