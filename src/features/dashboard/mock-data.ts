import type { Lead, LeadStatus } from '@/types/lead';

export interface DashboardMetrics {
  totalLeads: number;
  newLeads: number;
  followUpsDue: number;
  opportunitiesWon: number;
  totalPipelineValue: number;
  wonRevenue: number;
}

export interface PipelineStageSummary {
  status: LeadStatus;
  label: string;
  count: number;
  totalValue: number;
  colorClass: string;
  borderClass: string;
  bgClass: string;
}

export function computeDashboardMetrics(leads: Lead[]): DashboardMetrics {
  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === 'new').length;
  
  const followUpsDue = leads.filter((l) => {
    if (!l.next_follow_up) return false;
    const followUpDate = new Date(l.next_follow_up);
    // Due if follow up date is within the next 48 hours or past due, and not won/lost
    return l.status !== 'won' && l.status !== 'lost' && followUpDate.getTime() >= 0;
  }).length;

  const wonLeads = leads.filter((l) => l.status === 'won');
  const opportunitiesWon = wonLeads.length;
  const wonRevenue = wonLeads.reduce((acc, curr) => acc + curr.deal_value, 0);
  
  const activeLeads = leads.filter((l) => l.status !== 'lost');
  const totalPipelineValue = activeLeads.reduce((acc, curr) => acc + curr.deal_value, 0);

  return {
    totalLeads,
    newLeads,
    followUpsDue,
    opportunitiesWon,
    totalPipelineValue,
    wonRevenue,
  };
}

export const STAGE_CONFIG: Record<
  LeadStatus,
  { label: string; colorClass: string; borderClass: string; bgClass: string; badgeClass: string }
> = {
  new: {
    label: 'New Lead',
    colorClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    bgClass: 'bg-blue-50',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  qualified: {
    label: 'Qualified',
    colorClass: 'text-indigo-700',
    borderClass: 'border-indigo-200',
    bgClass: 'bg-indigo-50',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  proposal: {
    label: 'Proposal Sent',
    colorClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    bgClass: 'bg-amber-50',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  won: {
    label: 'Closed Won',
    colorClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
    bgClass: 'bg-emerald-50',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  lost: {
    label: 'Closed Lost',
    colorClass: 'text-slate-600',
    borderClass: 'border-slate-200',
    bgClass: 'bg-slate-50',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

export function getPipelineStages(leads: Lead[]): PipelineStageSummary[] {
  const stages: LeadStatus[] = ['new', 'qualified', 'proposal', 'won', 'lost'];
  
  return stages.map((status) => {
    const stageLeads = leads.filter((l) => l.status === status);
    const totalValue = stageLeads.reduce((acc, curr) => acc + curr.deal_value, 0);
    const config = STAGE_CONFIG[status];
    return {
      status,
      label: config.label,
      count: stageLeads.length,
      totalValue,
      colorClass: config.colorClass,
      borderClass: config.borderClass,
      bgClass: config.bgClass,
    };
  });
}
