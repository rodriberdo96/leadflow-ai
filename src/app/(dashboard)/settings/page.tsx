'use client';

import * as React from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Building,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Server,
  UserCheck,
  Key,
  Database,
  Lock,
} from 'lucide-react';
import { useAppMode } from '@/context/app-mode-context';
import { useAuth } from '@/context/auth-context';
import { useWorkspace } from '@/context/workspace-context';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const { isDemo, isProduction, resetDemoData, canUseProduction } = useAppMode();
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();

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
      // Direct network & health ping to Supabase service
      const { error } = await supabase.from('workspaces').select('id').limit(1);
      const elapsed = Math.round(performance.now() - start);

      if (error && error.code !== 'PGRST116') {
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
    const timer = setTimeout(() => {
      void checkConnection();
    }, 0);
    return () => clearTimeout(timer);
  }, [checkConnection]);

  return (
    <DashboardShell
      title="Settings & System Diagnostics"
      description="Inspect multi-tenant workspace identity, database connectivity, and environment configurations"
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
                  You are exploring LeadFlow AI in local in-memory storage. All mock leads, tasks, and
                  activities are isolated and will never touch or alter production database records.
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
                Operating with live Supabase authentication and PostgreSQL persistent storage for
                tenant: <span className="font-mono font-bold">{activeWorkspace?.name ?? 'Loading...'}</span>.
              </p>
            </div>
          </div>
        )}

        {/* Diagnostic Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Diagnostic 1: App Mode */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Execution Mode
              </span>
              <Server className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-sm font-bold text-slate-900">
              {isProduction ? 'Production Mode' : 'Demo Mode'}
            </div>
            <div className="text-[11px] text-slate-500">
              {isProduction ? 'Supabase Backend' : 'Client In-Memory'}
            </div>
          </div>

          {/* Diagnostic 2: Supabase Config */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Supabase Config
              </span>
              <Key className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              {canUseProduction ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Configured</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  <span>Unconfigured</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {canUseProduction ? 'URL & Anon Key Present' : 'Missing environment vars'}
            </div>
          </div>

          {/* Diagnostic 3: Connectivity */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                DB Connectivity
              </span>
              <Database className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              {dbStatus === 'connected' ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Online {dbLatency !== null ? `(${dbLatency}ms)` : ''}</span>
                </>
              ) : dbStatus === 'unreachable' ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>Unreachable</span>
                </>
              ) : dbStatus === 'checking' ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-slate-300" />
                  <span>Standalone</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-slate-500">
              {dbStatus === 'connected'
                ? 'Network response verified'
                : dbStatus === 'unreachable'
                ? 'Project unreachable'
                : 'Local mock engine'}
            </div>
          </div>

          {/* Diagnostic 4: Auth State */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Auth Session
              </span>
              <UserCheck className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-sm font-bold text-slate-900 truncate">
              {user ? user.email : 'Unauthenticated'}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {user ? `Role: ${activeWorkspace?.role ?? 'member'}` : 'Guest session'}
            </div>
          </div>
        </div>

        {/* Workspace Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-base font-semibold">Active Workspace Identity</CardTitle>
            </div>
            <CardDescription>
              Multi-tenant boundary metadata and current membership role
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Workspace Name
                </label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800">
                  {activeWorkspace?.name ?? 'Loading workspace...'}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Tenant Slug
                </label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-600">
                  {activeWorkspace?.slug ?? 'loading'}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Tenant Workspace ID
                </label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 truncate">
                  {activeWorkspace?.id ?? 'loading...'}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Your Permission Role
                </label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold capitalize text-indigo-700 flex items-center justify-between">
                  <span>{activeWorkspace?.role ?? 'member'}</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200">
                    Tenant Enforced
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database & Security Architecture Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-base font-semibold">Database & Security Architecture</CardTitle>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                RLS Implemented
              </span>
            </div>
            <CardDescription>
              PostgreSQL Row Level Security (RLS) enforcement and tenant data segregation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-700 space-y-2">
              <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                <span>Multi-Tenant Authorization Policy</span>
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Row Level Security (RLS) is enforced directly by PostgreSQL policies for all queries
                on <code className="font-mono font-semibold">leads</code>,{' '}
                <code className="font-mono font-semibold">tasks</code>,{' '}
                <code className="font-mono font-semibold">activities</code>, and{' '}
                <code className="font-mono font-semibold">workspace_members</code>.
                Users cannot access or modify records belonging to other tenants.
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-200/60 pt-2">
                Note: A successful database ping confirms network connectivity to Supabase, while authorization
                and tenant boundary checks are guaranteed server-side by PostgreSQL RLS policies and JWT session context.
              </p>
            </div>

            <div className="mt-2 text-xs text-slate-600 font-mono bg-slate-50 p-3 rounded-lg border border-slate-200/70 space-y-1">
              <div className="font-semibold text-slate-800 font-sans mb-1">Applied Database Migrations:</div>
              <div>• <span className="text-indigo-600">20250101000000_initial_schema.sql</span> (Multi-tenant core)</div>
              <div>• <span className="text-indigo-600">20250102000000_security_hardening.sql</span> (RLS hardening)</div>
              <div>• <span className="text-indigo-600">20250103000000_milestone2_remediation.sql</span> (Atomic RPCs & non-recursive policies)</div>
            </div>
          </CardContent>
        </Card>

        {/* AI Integration Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-base font-semibold">OpenAI Integration Architecture</CardTitle>
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
