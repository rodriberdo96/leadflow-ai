'use client';

import * as React from 'react';
import {
  Edit2,
  Trash2,
  Building2,
  Mail,
  Phone,
  Calendar,
  Share2,
  Plus,
} from 'lucide-react';
import type { Lead } from '@/types/lead';
import { StatusBadge } from './status-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LeadFormDialog } from './lead-form-dialog';
import { useLeads } from '@/features/leads/leads-context';

interface LeadTableProps {
  leads: Lead[];
  onOpenCreate: () => void;
}

export function LeadTable({ leads, onOpenCreate }: LeadTableProps) {
  const { deleteLead } = useLeads();
  const [editingLead, setEditingLead] = React.useState<Lead | null>(null);

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove lead "${name}"?`)) {
      deleteLead(id);
    }
  };

  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-3">
          <Building2 className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900">No leads match your criteria</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          Try adjusting your search terms, changing the stage filter, or create a new agency lead.
        </p>
        <div className="mt-5">
          <Button onClick={onOpenCreate} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Add New Lead
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Lead & Contact</th>
                <th className="px-4 py-3.5">Company</th>
                <th className="px-4 py-3.5">Service</th>
                <th className="px-4 py-3.5">Source</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Deal Value</th>
                <th className="px-4 py-3.5">Next Follow-up</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  {/* Name & Contact Info */}
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-900">{lead.name}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-slate-400" />
                        {lead.email}
                      </span>
                      {lead.phone && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {lead.phone}
                          </span>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Company */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-medium text-slate-800 text-xs">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      <span>{lead.company}</span>
                    </div>
                  </td>

                  {/* Requested Service */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-700 font-medium">
                    <span className="inline-block bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200/60">
                      {lead.service}
                    </span>
                  </td>

                  {/* Source */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Share2 className="h-3 w-3 text-slate-400" />
                      {lead.source}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <StatusBadge status={lead.status} />
                  </td>

                  {/* Estimated Deal Value */}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap font-semibold text-slate-900 text-xs">
                    {formatCurrency(lead.deal_value)}
                  </td>

                  {/* Next Follow-up Date */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500">
                    {lead.next_follow_up ? (
                      <span className="flex items-center gap-1 text-slate-700 font-medium">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {formatDate(lead.next_follow_up)}
                      </span>
                    ) : (
                      <span className="text-slate-400">None scheduled</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingLead(lead)}
                        className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                        title="Edit Lead"
                        aria-label={`Edit lead ${lead.name}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(lead.id, lead.name)}
                        className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Delete Lead"
                        aria-label={`Delete lead ${lead.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingLead && (
        <LeadFormDialog
          isOpen={Boolean(editingLead)}
          onClose={() => setEditingLead(null)}
          leadToEdit={editingLead}
        />
      )}
    </>
  );
}
