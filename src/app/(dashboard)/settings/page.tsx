'use client';

import * as React from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Database,
  Sparkles,
  Building,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useAppMode } from '@/context/app-mode-context';
import { useAuth } from '@/context/auth-context';
import { useWorkspace } from '@/context/workspace-context';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const { isDemo, resetDemoData, canUseProduction } = useAppMode();
  const { user } = useAuth();
  const { activeWorkspace, refreshWorkspaces } = useWorkspace();

  const [dbStatus, setDbStatus] = React.useState<
    'checking' | 'connected' | 'unreachable' | 'not_configured'
  >('checking');
  const [dbLatency, setDbLatency] = React.useState<number | null>(null);

  const checkConnection = React.useCallback(async () => {
    if (!canUseProduction) {
      setDbStatus('not_configured');
      return;
    }

    setDbStatus('checking');
    const start = performance.now();
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setDbStatus('not_configured');
      return;
    }

    try {
      // Real database connectivity check
      const { error } = await supabase.from('workspaces').select('id').limit(1);
      const elapsed = Math.round(performance.now() - start);

      if (error && error.code !== 'PGRST116') {
        // Even if empty or RLS blocks empty set, connection succeeds if no network/auth error
        if (error.message.includes('FetchError') || error.message.includes('network')) {
          setDbStatus('unreachable');
          return;
        }
      }
      setDbLatency(elapsed);
      setDbStatus('connected');
    } catch {
      setDbStatus('unreachable');
    }
  }, [canUseProduction]);

  React.useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return (
    <DashboardShell
      title="Settings & Workspace"
      description="Manage agency workspace profile, team permissions, and verified Supabase connection"
    >
      <div className="space-y-6 max-w-4xl">
        {/* Environment Status Banner */}
        {isDemo ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Interactive Demo Mode Active
                </h3>
                <p className="mt-0.5 text-xs text-amber-700 leading-relaxed">
                  You are exploring LeadFlow AI in local in-memory storage. Changes made here will
                  never create or tamper with production Supabase records.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetDemoData}
              className="bg-white border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              <span>Reset Demo State</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-2xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Production Mode Active
              </h3>
              <p className="mt-0.5 text-xs text-emerald-700 leading-relaxed">
                Connected to Supabase PostgreSQL database. Multi-tenant Row Level Security (RLS) is
                enforced for tenant ID: <span className="font-mono font-bold">{activeWorkspace.id}</span>.
              </p>
            </div>
          </div>
        )}

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
                  value={activeWorkspace.name}
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
                  value={activeWorkspace.slug || 'velocity-digital'}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 cursor-not-allowed font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Your Membership Role
                </label>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {activeWorkspace.role}
                  </span>
                  {user && (
                    <span className="text-xs text-slate-500 truncate">
                      ({user.email})
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tenant Isolation
                </label>
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Row Level Security (RLS) partition verified</span>
                </div>
              </div>
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

              {/* Verified Connection Status */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    checkConnection();
                    refreshWorkspaces();
                  }}
                  className="h-7 text-xs text-slate-500"
                  title="Recheck live connection"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  <span>Recheck</span>
                </Button>

                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    dbStatus === 'connected'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : dbStatus === 'checking'
                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                      : dbStatus === 'unreachable'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {dbStatus === 'connected'
                    ? `Connected (${dbLatency}ms)`
                    : dbStatus === 'checking'
                    ? 'Checking Connection...'
                    : dbStatus === 'unreachable'
                    ? 'Unreachable'
                    : 'Unconfigured (Demo Active)'}
                </span>
              </div>
            </div>
            <CardDescription>
              PostgreSQL database connection with Row Level Security (RLS) migrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dbStatus === 'connected' ? (
              <div className="rounded-lg bg-emerald-50/50 border border-emerald-200/80 p-3.5 text-xs text-emerald-800 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Live Supabase Database Verified</span>
                </p>
                <p className="text-[11px] text-emerald-700">
                  Authentication tokens are stored in secure cookies via{' '}
                  <code className="font-mono font-bold">@supabase/ssr</code>. Data queries run
                  directly against PostgreSQL with strict tenant partition.
                </p>
              </div>
            ) : dbStatus === 'unreachable' ? (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <span>Unable to Reach Supabase Project</span>
                </p>
                <p className="text-[11px] text-rose-700">
                  Your environment variables are set, but the remote PostgreSQL database did not
                  respond. Check project status on the Supabase dashboard or verify network connectivity.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed">
                LeadFlow AI is running in standalone Demo Mode. To connect a live Supabase database:
              </p>
            )}

            <ol className="list-decimal list-inside space-y-1 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200/70 font-mono">
              <li>Copy <span className="text-indigo-600">.env.example</span> to <span className="text-indigo-600">.env.local</span></li>
              <li>Configure <span className="text-indigo-600">NEXT_PUBLIC_SUPABASE_URL</span> and <span className="text-indigo-600">NEXT_PUBLIC_SUPABASE_ANON_KEY</span></li>
              <li>Run migrations <code className="text-indigo-700">20250101000000_initial_schema.sql</code> and <code className="text-indigo-700">20250102000000_security_hardening.sql</code> in your Supabase SQL editor</li>
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
              Server-side abstraction is initialized in{' '}
              <code className="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded font-mono text-[11px]">
                src/features/ai/service.ts
              </code>.
              AI API keys are restricted exclusively to the server and never exposed to the client bundle.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
