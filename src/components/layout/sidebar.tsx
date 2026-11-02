'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  Activity,
  Settings,
  Sparkles,
  ChevronRight,
  Layers,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLeads } from '@/features/leads/leads-context';
import { useAuth } from '@/context/auth-context';
import { useWorkspace } from '@/context/workspace-context';
import { useAppMode } from '@/context/app-mode-context';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Leads',
    href: '/leads',
    icon: Users,
    badgeKey: 'totalLeads' as const,
  },
  {
    label: 'Sales Pipeline',
    href: '/pipeline',
    icon: Kanban,
  },
  {
    label: 'Follow-ups',
    href: '/tasks',
    icon: CheckSquare,
    badgeKey: 'followUpsDue' as const,
  },
  {
    label: 'Activities',
    href: '/activities',
    icon: Activity,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { metrics } = useLeads();
  const { user, signOut } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { isDemo } = useAppMode();

  const userDisplayName = isDemo
    ? 'Agency Director (Demo)'
    : user?.user_metadata?.full_name || 'Agency Member';

  const userEmail = isDemo ? 'demo@velocityagency.com' : user?.email || 'authenticated-user';

  const userInitials = userDisplayName
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Shell */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200/90 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand / Logo Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold shadow-xs">
              <Layers className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900">
                LeadFlow <span className="text-indigo-600">AI</span>
              </span>
              <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {isDemo ? 'Demo Experience' : activeWorkspace?.role || 'Agency Workspace'}
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const badgeValue = item.badgeKey ? metrics[item.badgeKey] : null;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                    )}
                  />
                  <span>{item.label}</span>
                </div>

                {badgeValue !== null && badgeValue > 0 && (
                  <span
                    className={cn(
                      'ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      isActive
                        ? 'bg-indigo-200/70 text-indigo-900'
                        : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {badgeValue}
                  </span>
                )}
              </Link>
            );
          })}

          {/* AI Features Sneak Peek Card */}
          <div className="pt-6">
            <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-slate-50 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                <span>AI Automation (Phase 2)</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                Auto-classify leads, summarize calls & draft replies with OpenAI.
              </p>
              <div className="mt-2.5 flex items-center text-[11px] font-semibold text-indigo-600">
                <span>Architecture Ready</span>
                <ChevronRight className="h-3 w-3 ml-0.5" />
              </div>
            </div>
          </div>
        </nav>

        {/* Footer User Info */}
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center justify-between rounded-lg p-2 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 shrink-0">
                {userInitials || 'AG'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">
                  {userDisplayName}
                </p>
                <p className="truncate text-[11px] text-slate-500">{userEmail}</p>
              </div>
            </div>

            {!isDemo && user && (
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-md p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
