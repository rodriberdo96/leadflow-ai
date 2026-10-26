export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  user_email?: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  workspace_id: string;
  plan: 'free' | 'starter' | 'growth' | 'agency';
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  current_period_end?: string;
}
