export type LeadStatus = 'new' | 'qualified' | 'proposal' | 'won' | 'lost';

export type LeadSource =
  | 'Website Form'
  | 'Referral'
  | 'LinkedIn'
  | 'Cold Outreach'
  | 'Google Search'
  | 'Event';

export type LeadService =
  | 'Web Development'
  | 'UI/UX Design'
  | 'SEO Optimization'
  | 'Paid Advertising'
  | 'Branding & Identity'
  | 'Custom Software';

export interface Lead {
  id: string;
  workspace_id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  service: LeadService | string;
  source: LeadSource | string;
  status: LeadStatus;
  deal_value: number;
  next_follow_up?: string;
  notes?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  workspace_id: string;
  lead_id: string;
  user_id?: string;
  type: 'note' | 'status_change' | 'email' | 'call' | 'meeting' | 'ai_summary' | 'ai_classification';
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface LeadTask {
  id: string;
  workspace_id: string;
  lead_id?: string;
  lead_name?: string;
  assigned_to?: string;
  title: string;
  due_date: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
}
