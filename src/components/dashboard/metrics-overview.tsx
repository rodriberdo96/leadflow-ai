'use client';

import * as React from 'react';
import { Users, UserPlus, Clock, Trophy } from 'lucide-react';
import { useLeads } from '@/features/leads/leads-context';
import { formatCurrency } from '@/lib/utils';

export function MetricsOverview() {
  const { metrics } = useLeads();

  const cards = [
    {
      title: 'Total Active Leads',
      value: metrics.totalLeads,
      description: `${formatCurrency(metrics.totalPipelineValue)} pipeline value`,
      icon: Users,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50 border-indigo-100',
    },
    {
      title: 'New Leads',
      value: metrics.newLeads,
      description: 'Awaiting initial discovery',
      icon: UserPlus,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50 border-blue-100',
    },
    {
      title: 'Follow-ups Due',
      value: metrics.followUpsDue,
      description: 'Scheduled reminders & tasks',
      icon: Clock,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50 border-amber-100',
    },
    {
      title: 'Opportunities Won',
      value: metrics.opportunitiesWon,
      description: `${formatCurrency(metrics.wonRevenue)} closed revenue`,
      icon: Trophy,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50 border-emerald-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs transition-shadow hover:shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {card.title}
              </span>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg border ${card.iconBg}`}
              >
                <Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {card.value}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{card.description}</p>
          </div>
        );
      })}
    </div>
  );
}
