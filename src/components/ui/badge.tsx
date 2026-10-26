import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger' | 'info';
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
    secondary: 'bg-slate-100 text-slate-700 border-slate-200',
    outline: 'border-slate-200 text-slate-700 bg-transparent',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/70',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/70',
    info: 'bg-sky-50 text-sky-700 border-sky-200/70',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
