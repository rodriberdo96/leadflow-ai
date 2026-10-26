'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight, Building2, Mail } from 'lucide-react';
import { useLeads } from '@/features/leads/leads-context';
import { StatusBadge } from '@/components/leads/status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function RecentLeadsTable() {
  const { leads } = useLeads();
  const recentLeads = leads.slice(0, 5);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Recent Leads</CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Latest prospects submitted or updated
          </p>
        </div>
        <Link
          href="/leads"
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <span>All Leads ({leads.length})</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        {recentLeads.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500">No leads added yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Lead & Company</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-5 py-3">Next Follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{lead.name}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          {lead.company}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-slate-400" />
                          {lead.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 font-medium whitespace-nowrap">
                      {lead.service}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {formatCurrency(lead.deal_value)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {lead.next_follow_up ? formatDate(lead.next_follow_up) : 'None scheduled'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
