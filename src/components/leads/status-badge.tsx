import * as React from 'react';
import type { LeadStatus } from '@/types/lead';
import { STAGE_CONFIG } from '@/features/dashboard/mock-data';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STAGE_CONFIG[status] || {
    label: status,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-2xs capitalize',
        config.badgeClass,
        className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          status === 'new' && 'bg-blue-500',
          status === 'qualified' && 'bg-indigo-500',
          status === 'proposal' && 'bg-amber-500',
          status === 'won' && 'bg-emerald-500',
          status === 'lost' && 'bg-slate-400'
        )}
      />
      {config.label}
    </span>
  );
}
