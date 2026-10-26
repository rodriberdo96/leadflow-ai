'use client';

import * as React from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { MetricsOverview } from '@/components/dashboard/metrics-overview';
import { PipelineOverview } from '@/components/dashboard/pipeline-overview';
import { RecentLeadsTable } from '@/components/dashboard/recent-leads-table';
import { FollowUpTaskList } from '@/components/dashboard/follow-up-task-list';
import { ArrowRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <DashboardShell
      title="Agency Overview"
      description="Real-time pipeline performance, lead metrics, and scheduled actions"
    >
      <div className="space-y-6">
        {/* Top Welcome / Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-slate-50 p-4 sm:p-5 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-white">
                <TrendingUp className="h-3.5 w-3.5" />
              </span>
              <h2 className="text-sm font-bold text-slate-900">
                Milestone 1 Active: Agency Sales Workspace
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-600 max-w-2xl leading-relaxed">
              Managing agency client acquisition. Interactive lead creation, pipeline stages, and follow-up tracking are enabled in-memory. Multi-tenant database migrations and server-side AI stubs are prepared for Milestone 2.
            </p>
          </div>
          <Link
            href="/leads"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-indigo-700 border border-indigo-200 shadow-2xs hover:bg-indigo-50/50 transition-colors shrink-0"
          >
            <span>Manage All Leads</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* 1. Metrics Overview (Total leads, New leads, Follow-ups due, Won) */}
        <MetricsOverview />

        {/* 2. Visual Sales Pipeline Overview */}
        <PipelineOverview />

        {/* 3. Recent Leads Table + Follow-up Tasks Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentLeadsTable />
          </div>
          <div>
            <FollowUpTaskList />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
