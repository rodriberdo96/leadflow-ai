'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useLeads } from '@/features/leads/leads-context';
import { getPipelineStages } from '@/features/dashboard/mock-data';
import { formatCurrency } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function PipelineOverview() {
  const { leads } = useLeads();
  const stages = getPipelineStages(leads);
  const totalCount = leads.length || 1;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold">
            Sales Pipeline Overview
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Distribution of prospects across agency sales stages
          </p>
        </div>
        <Link
          href="/pipeline"
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <span>View Pipeline</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>

      <CardContent>
        {/* Progress bar visualizing pipeline weight */}
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 gap-0.5 mb-6">
          {stages.map((stage) => {
            const pct = Math.max((stage.count / totalCount) * 100, stage.count > 0 ? 8 : 0);
            if (stage.count === 0) return null;

            const bgMap: Record<string, string> = {
              new: 'bg-blue-500',
              qualified: 'bg-indigo-500',
              proposal: 'bg-amber-500',
              won: 'bg-emerald-500',
              lost: 'bg-slate-400',
            };

            return (
              <div
                key={stage.status}
                style={{ width: `${pct}%` }}
                className={`h-full rounded-xs transition-all ${bgMap[stage.status] || 'bg-slate-300'}`}
                title={`${stage.label}: ${stage.count} leads (${formatCurrency(stage.totalValue)})`}
              />
            );
          })}
        </div>

        {/* Stage Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {stages.map((stage) => (
            <div
              key={stage.status}
              className={`rounded-lg border p-3.5 ${stage.bgClass} ${stage.borderClass}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${stage.colorClass}`}>
                  {stage.label}
                </span>
                <span className="text-xs font-bold text-slate-800 bg-white/80 px-1.5 py-0.5 rounded shadow-2xs">
                  {stage.count}
                </span>
              </div>
              <div className="mt-2.5">
                <p className="text-sm font-bold text-slate-900">
                  {formatCurrency(stage.totalValue)}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {((stage.count / totalCount) * 100).toFixed(0)}% of pipeline
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
