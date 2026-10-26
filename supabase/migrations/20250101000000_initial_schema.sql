-- ==============================================================================
-- LeadFlow AI - Initial Multi-Tenant Schema & Row Level Security
-- ==============================================================================

-- 1. Helper Function: Check Workspace Membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper Function: Check Workspace Admin/Owner
CREATE OR REPLACE FUNCTION public.is_workspace_admin(ws_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- Table: Workspaces
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view their workspaces"
  ON public.workspaces
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create workspaces"
  ON public.workspaces
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Workspace admins can update their workspace"
  ON public.workspaces
  FOR UPDATE
  USING (public.is_workspace_admin(id))
  WITH CHECK (public.is_workspace_admin(id));

-- ==============================================================================
-- Table: Workspace Members
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON public.workspace_members(workspace_id);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view other members in their workspace"
  ON public.workspace_members
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Admins can add members to their workspace"
  ON public.workspace_members
  FOR INSERT
  WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admins can update membership in their workspace"
  ON public.workspace_members
  FOR UPDATE
  USING (public.is_workspace_admin(workspace_id))
  WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admins can remove members from their workspace"
  ON public.workspace_members
  FOR DELETE
  USING (public.is_workspace_admin(workspace_id));

-- ==============================================================================
-- Table: Subscriptions
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  plan text NOT NULL DEFAULT 'starter' CHECK (plan IN ('free', 'starter', 'growth', 'agency')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled')),
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace subscription"
  ON public.subscriptions
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

-- ==============================================================================
-- Table: Leads
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  company text NOT NULL,
  email text NOT NULL,
  phone text,
  service text NOT NULL,
  source text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'qualified', 'proposal', 'won', 'lost')),
  deal_value numeric(12,2) DEFAULT 0 NOT NULL CHECK (deal_value >= 0),
  next_follow_up timestamptz,
  notes text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_workspace_status ON public.leads(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up ON public.leads(workspace_id, next_follow_up);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view leads in their workspace"
  ON public.leads
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can insert leads into their workspace"
  ON public.leads
  FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update leads in their workspace"
  ON public.leads
  FOR UPDATE
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can delete leads in their workspace"
  ON public.leads
  FOR DELETE
  USING (public.is_workspace_member(workspace_id));

-- ==============================================================================
-- Table: Activities
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('note', 'status_change', 'email', 'call', 'meeting', 'ai_summary', 'ai_classification')),
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activities_lead ON public.activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_workspace ON public.activities(workspace_id);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view activities in their workspace"
  ON public.activities
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can insert activities in their workspace"
  ON public.activities
  FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

-- ==============================================================================
-- Table: Tasks
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  due_date timestamptz NOT NULL,
  completed boolean DEFAULT false NOT NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_due ON public.tasks(workspace_id, due_date, completed);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tasks in their workspace"
  ON public.tasks
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can insert tasks in their workspace"
  ON public.tasks
  FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update tasks in their workspace"
  ON public.tasks
  FOR UPDATE
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can delete tasks in their workspace"
  ON public.tasks
  FOR DELETE
  USING (public.is_workspace_member(workspace_id));

-- ==============================================================================
-- Table: AI Usage (Cost & Limits Control)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feature text NOT NULL CHECK (feature IN ('classification', 'summary', 'reply_draft')),
  tokens_used integer DEFAULT 0 NOT NULL CHECK (tokens_used >= 0),
  model text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_workspace ON public.ai_usage(workspace_id, created_at);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view AI usage for their workspace"
  ON public.ai_usage
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can record AI usage for their workspace"
  ON public.ai_usage
  FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));
