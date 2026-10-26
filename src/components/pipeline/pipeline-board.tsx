'use client';

import * as React from 'react';
import { Building2, Calendar } from 'lucide-react';
import type { Lead, LeadStatus } from '@/types/lead';
import { useLeads } from '@/features/leads/leads-context';
import { formatCurrency, formatDate } from '@/lib/utils';
import { LeadFormDialog } from '@/components/leads/lead-form-dialog';
import { STAGE_CONFIG } from '@/features/dashboard/mock-data';

const STAGES: LeadStatus[] = ['new', 'qualified', 'proposal', 'won', 'lost'];

export function PipelineBoard() {
  const { leads, updateLead } = useLeads();
  const [editingLead, setEditingLead] = React.useState<Lead | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
        {STAGES.map((stage) => {
          const config = STAGE_CONFIG[stage];
          const stageLeads = leads.filter((l) => l.status === stage);
          const stageValue = stageLeads.reduce((acc, curr) => acc + curr.deal_value, 0);

          return (
            <div
              key={stage}
              className="flex flex-col rounded-xl border border-slate-200/90 bg-slate-100/60 p-3 min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        stage === 'new'
                          ? 'bg-blue-500'
                          : stage === 'qualified'
                          ? 'bg-indigo-500'
                          : stage === 'proposal'
                          ? 'bg-amber-500'
                          : stage === 'won'
                          ? 'bg-emerald-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {config.label}
                    </h3>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                    {formatCurrency(stageValue)}
                  </p>
                </div>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-slate-600 shadow-2xs border border-slate-200">
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="flex-1 space-y-2.5 overflow-y-auto">
                {stageLeads.length === 0 ? (
                  <div className="p-4 text-center border border-dashed border-slate-200 rounded-lg bg-white/40">
                    <p className="text-[11px] text-slate-400">No deals in this stage</p>
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => setEditingLead(lead)}
                      className="group rounded-lg border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:shadow-xs hover:border-indigo-300 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                          {lead.service}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {formatCurrency(lead.deal_value)}
                        </span>
                      </div>

                      <h4 className="mt-2 text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {lead.name}
                      </h4>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        <span>{lead.company}</span>
                      </div>

                      {lead.next_follow_up && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {formatDate(lead.next_follow_up)}
                          </span>
                        </div>
                      )}

                      {/* Quick Move stage selector */}
                      <div
                        className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>Move stage:</span>
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            updateLead(lead.id, { status: e.target.value as LeadStatus })
                          }
                          className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-700"
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              {STAGE_CONFIG[s].label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

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
