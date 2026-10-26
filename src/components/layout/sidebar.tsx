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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLeads } from '@/features/leads/leads-context';

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
  const { metrics, activeWorkspace } = useLeads();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200/90 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 tracking-tight text-base">
                  LeadFlow
                </span>
                <span className="rounded bg-indigo-50 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-600 border border-indigo-200/50">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">B2B Agency Growth</p>
            </div>
          </Link>
        </div>

        {/* Agency Workspace Switcher */}
        <div className="p-3 border-b border-slate-100">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 border border-slate-200/60">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800">
                {activeWorkspace.name}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{activeWorkspace.role}</span>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              SaaS
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          <div className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation
          </div>

          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;
            const badgeValue = item.badgeKey ? metrics[item.badgeKey] : null;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50 transition-colors">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
              AD
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800">
                Agency Director
              </p>
              <p className="truncate text-[11px] text-slate-500">
                alex@velocityagency.com
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
