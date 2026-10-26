'use client';

import * as React from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { PipelineBoard } from '@/components/pipeline/pipeline-board';
import { useLeads } from '@/features/leads/leads-context';
import { formatCurrency } from '@/lib/utils';

export default function PipelinePage() {
  const { metrics } = useLeads();

  return (
    <DashboardShell
      title="Sales Pipeline"
      description="Visual stage progression for prospective agency client engagements"
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Active Pipeline
            </span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {formatCurrency(metrics.totalPipelineValue)}
            </div>
          </div>
          <div className="text-xs text-slate-500">
            Click any card to edit details or use the quick dropdown to advance a prospect to the next stage.
          </div>
        </div>

        <PipelineBoard />
      </div>
    </DashboardShell>
  );
}
