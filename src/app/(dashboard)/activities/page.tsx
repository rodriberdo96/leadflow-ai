'use client';

import * as React from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useLeads } from '@/features/leads/leads-context';
import { formatDate } from '@/lib/utils';
import { MessageSquare, PhoneCall, Calendar, CheckSquare, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function ActivitiesPage() {
  const { activities, leads } = useLeads();

  const getLeadName = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    return lead ? `${lead.name} (${lead.company})` : 'Prospective Client';
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <PhoneCall className="h-4 w-4 text-blue-600" />;
      case 'meeting':
        return <Calendar className="h-4 w-4 text-indigo-600" />;
      case 'status_change':
        return <CheckSquare className="h-4 w-4 text-emerald-600" />;
      case 'ai_summary':
      case 'ai_classification':
        return <Sparkles className="h-4 w-4 text-purple-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <DashboardShell
      title="Activity History"
      description="Chronological log of notes, calls, meetings, and stage changes"
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Audit Trail</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activities.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No activity records logged yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start gap-3.5 p-4 sm:px-6 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 shrink-0">
                      {getIcon(act.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900">
                          {getLeadName(act.lead_id)}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatDate(act.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                        {act.description}
                      </p>
                      <span className="mt-1.5 inline-block text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        {act.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
