'use client';

import * as React from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Database, Sparkles, Building, ShieldCheck } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export default function SettingsPage() {
  return (
    <DashboardShell
      title="Settings & Workspace"
      description="Manage agency workspace profile, team permissions, and third-party integrations"
    >
      <div className="space-y-6 max-w-4xl">
        {/* Workspace Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-base font-semibold">Agency Workspace Profile</CardTitle>
            </div>
            <CardDescription>
              Organization identity and multi-tenant domain settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  readOnly
                  value="Velocity Digital Agency"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Workspace Slug
                </label>
                <input
                  type="text"
                  readOnly
                  value="velocity-digital"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 cursor-not-allowed"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Multi-tenant Row Level Security (RLS) isolation policy enabled.</span>
            </div>
          </CardContent>
        </Card>

        {/* Database Integration Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-base font-semibold">Supabase PostgreSQL & Auth</CardTitle>
              </div>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  isSupabaseConfigured
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {isSupabaseConfigured ? 'Connected' : 'Mock / In-Memory Mode'}
              </span>
            </div>
            <CardDescription>
              PostgreSQL database connection with Row Level Security (RLS) migrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              The migration file has been created at <code className="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded font-mono text-[11px]">supabase/migrations/20250101000000_initial_schema.sql</code>.
              To link to a live Supabase project:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200/70 font-mono">
              <li>Copy <span className="text-indigo-600">.env.example</span> to <span className="text-indigo-600">.env.local</span></li>
              <li>Add your <span className="text-indigo-600">NEXT_PUBLIC_SUPABASE_URL</span> and <span className="text-indigo-600">NEXT_PUBLIC_SUPABASE_ANON_KEY</span></li>
              <li>Execute the migration SQL in your Supabase SQL editor</li>
            </ol>
          </CardContent>
        </Card>

        {/* AI Integration Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-base font-semibold">OpenAI Server Integration</CardTitle>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Phase 2 Architecture Ready
              </span>
            </div>
            <CardDescription>
              Server-only AI endpoints for lead classification, summaries, and reply suggestions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              Server-side abstraction is initialized in <code className="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded font-mono text-[11px]">src/features/ai/service.ts</code>.
              AI API keys are restricted exclusively to the server and never exposed to the client bundle.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
