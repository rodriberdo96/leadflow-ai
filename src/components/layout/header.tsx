'use client';

import * as React from 'react';
import { Menu, Plus, ShieldCheck, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeadFormDialog } from '@/components/leads/lead-form-dialog';
import { isSupabaseConfigured } from '@/lib/supabase/client';

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
  description?: string;
}

export function Header({ onMenuClick, title, description }: HeaderProps) {
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 sm:px-6 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden"
            aria-label="Open navigation sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight sm:text-xl">
              {title}
            </h1>
            {description && (
              <p className="hidden sm:block text-xs text-slate-500">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            {isSupabaseConfigured ? (
              <>
                <Database className="h-3.5 w-3.5 text-emerald-600" />
                <span>Supabase Connected</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                <span>Demo Workspace (In-Memory)</span>
              </>
            )}
          </div>

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
