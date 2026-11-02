'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Plus,
  ShieldCheck,
  Database,
  LogOut,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeadFormDialog } from '@/components/leads/lead-form-dialog';
import { useAuth } from '@/context/auth-context';
import { useAppMode } from '@/context/app-mode-context';
import { useWorkspace } from '@/context/workspace-context';

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
  description?: string;
}

export function Header({ onMenuClick, title, description }: HeaderProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isDemo, resetDemoData, canUseProduction } = useAppMode();
  const { activeWorkspace } = useWorkspace();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 sm:px-6 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden cursor-pointer"
            aria-label="Open navigation sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight sm:text-xl">
                {title}
              </h1>
              {activeWorkspace?.name && (
                <span className="hidden lg:inline-flex text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  {activeWorkspace.name}
                </span>
              )}
            </div>
            {description && (
              <p className="hidden sm:block text-xs text-slate-500">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode & Connection Indicator */}
          {isDemo ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                <span>Demo Mode (Local Storage)</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetDemoData}
                title="Reset sample data back to initial state"
                className="hidden sm:inline-flex text-[11px] h-7 px-2 text-slate-600"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                <span>Reset Demo</span>
              </Button>
              {canUseProduction && (
                <Link
                  href="/login"
                  className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Go to Production Login</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Database className="h-3.5 w-3.5 text-emerald-600" />
                <span>Production (Supabase)</span>
              </div>
              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="h-8 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                  title="Sign out of workspace"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              )}
            </div>
          )}

          {/* Primary Action Button */}
          <Button
            onClick={() => setIsCreateOpen(true)}
            size="md"
            className="shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Lead</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </header>

      {/* Global Create Lead Modal */}
      <LeadFormDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </>
  );
}
