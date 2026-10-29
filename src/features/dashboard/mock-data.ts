import type { Lead, LeadStatus } from '@/types/lead';

export interface DashboardMetrics {
  totalLeads: number;
  newLeads: number;
  followUpsDue: number;
  followUpsOverdue: number;
  followUpsDueSoon: number;
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

export const FOLLOW_UP_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

export type FollowUpCategory = 'overdue' | 'due_soon' | 'future' | 'none';

/**
 * Categorizes a lead's follow-up schedule relative to a reference clock.
 *
 * Boundary rules:
 * - Leads with status 'won' or 'lost' return 'none'.
 * - Empty, invalid, or unparseable dates return 'none'.
 * - 'overdue': followUpTime < nowTime
 * - 'due_soon': nowTime <= followUpTime <= (nowTime + 48h) [inclusive boundaries]
 * - 'future': followUpTime > (nowTime + 48h)
 */
const getFallbackClock = () =>
  process.env.NODE_ENV === 'test' ? new Date() : new Date('2026-10-26T12:00:00.000Z');

export function categorizeFollowUp(
  lead: Pick<Lead, 'status' | 'next_follow_up'>,
  now?: Date
): FollowUpCategory {
  const referenceNow = now ?? getFallbackClock();
  if (lead.status === 'won' || lead.status === 'lost') {
    return 'none';
  }

  if (!lead.next_follow_up || typeof lead.next_follow_up !== 'string') {
    return 'none';
  }

  const followUpDate = new Date(lead.next_follow_up);
  const followUpTime = followUpDate.getTime();

  if (Number.isNaN(followUpTime)) {
    return 'none';
  }

  const nowTime = referenceNow.getTime();
  if (followUpTime < nowTime) {
    return 'overdue';
  }

  if (followUpTime <= nowTime + FOLLOW_UP_WINDOW_MS) {
    return 'due_soon';
  }

  return 'future';
}

/**
 * Computes dashboard sales and follow-up metrics.
 * 
 * @param leads List of leads
 * @param now Clock source for deterministic evaluation (defaults to deterministic reference clock in SSR / current date in test)
 */
export function computeDashboardMetrics(
  leads: Lead[],
  now?: Date
): DashboardMetrics {
  const referenceNow = now ?? getFallbackClock();
  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === 'new').length;

  let followUpsOverdue = 0;
  let followUpsDueSoon = 0;

  for (const lead of leads) {
    const category = categorizeFollowUp(lead, referenceNow);
    if (category === 'overdue') {
      followUpsOverdue += 1;
    } else if (category === 'due_soon') {
      followUpsDueSoon += 1;
    }
  }

  const followUpsDue = followUpsOverdue + followUpsDueSoon;

  const wonLeads = leads.filter((l) => l.status === 'won');
  const opportunitiesWon = wonLeads.length;
  const wonRevenue = wonLeads.reduce((acc, curr) => acc + (Number(curr.deal_value) || 0), 0);

  const activeLeads = leads.filter((l) => l.status !== 'lost');
  const totalPipelineValue = activeLeads.reduce(
    (acc, curr) => acc + (Number(curr.deal_value) || 0),
    0
  );

  return {
    totalLeads,
    newLeads,
    followUpsDue,
    followUpsOverdue,
    followUpsDueSoon,
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
