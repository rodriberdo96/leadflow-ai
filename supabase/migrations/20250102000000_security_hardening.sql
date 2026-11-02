-- ==============================================================================
-- LeadFlow AI - Migration: Security Hardening & Multi-Tenant RLS Enforcement
-- Migration ID: 20250102000000_security_hardening.sql
-- ==============================================================================

-- 1. Security-Definer Functions Hardening (Explicit safe search_path & object qualification)
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public;

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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(ws_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
      AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public;

-- Revoke default public execution privileges and restrict to authenticated and service_role
REVOKE ALL ON FUNCTION public.is_workspace_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_workspace_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_workspace_owner(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_workspace_owner(uuid) TO authenticated, service_role;

-- 2. Atomic Workspace Creation & Initial Owner Assignment
CREATE OR REPLACE FUNCTION public.create_workspace(
  name text,
  slug text
) RETURNS uuid AS $$
DECLARE
  new_ws_id uuid;
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create a workspace';
  END IF;

  IF name IS NULL OR trim(name) = '' THEN
    RAISE EXCEPTION 'Workspace name cannot be empty';
  END IF;

  IF slug IS NULL OR trim(slug) = '' THEN
    RAISE EXCEPTION 'Workspace slug cannot be empty';
  END IF;

  -- Create workspace record
  INSERT INTO public.workspaces (name, slug)
  VALUES (trim(name), trim(slug))
  RETURNING id INTO new_ws_id;

  -- Atomically establish the creator as the initial 'owner'
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_ws_id, current_user_id, 'owner');

  -- Provision default starter subscription record
  INSERT INTO public.subscriptions (workspace_id, plan, status)
  VALUES (new_ws_id, 'starter', 'active')
  ON CONFLICT (workspace_id) DO NOTHING;

  RETURN new_ws_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.create_workspace(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_workspace(text, text) TO authenticated;

-- 3. Workspaces RLS: Ensure only owners can delete a workspace
DROP POLICY IF EXISTS "Workspace owners can delete their workspace" ON public.workspaces;
CREATE POLICY "Workspace owners can delete their workspace"
  ON public.workspaces
  FOR DELETE
  USING (public.is_workspace_owner(id));

-- 4. Workspace Members RLS Hardening (Prevent role elevation and cross-tenant tampering)
DROP POLICY IF EXISTS "Admins can add members to their workspace" ON public.workspace_members;
CREATE POLICY "Admins can add members to their workspace"
  ON public.workspace_members
  FOR INSERT
  WITH CHECK (
    public.is_workspace_admin(workspace_id)
    -- Regular admins cannot create another owner; only current owner can do so
    AND (role != 'owner' OR public.is_workspace_owner(workspace_id))
  );

DROP POLICY IF EXISTS "Admins can update membership in their workspace" ON public.workspace_members;
CREATE POLICY "Admins can update membership in their workspace"
  ON public.workspace_members
  FOR UPDATE
  USING (
    public.is_workspace_admin(workspace_id)
    AND (
      role != 'owner' OR public.is_workspace_owner(workspace_id)
    )
  )
  WITH CHECK (
    public.is_workspace_admin(workspace_id)
    -- Prevent self role elevation: users cannot update their own role
    AND (
      user_id != auth.uid() OR
      role = (
        SELECT m.role
        FROM public.workspace_members m
        WHERE m.workspace_id = workspace_members.workspace_id
          AND m.user_id = auth.uid()
      )
    )
    -- Only existing owner can promote anyone to owner
    AND (role != 'owner' OR public.is_workspace_owner(workspace_id))
  );

DROP POLICY IF EXISTS "Admins can remove members from their workspace" ON public.workspace_members;
CREATE POLICY "Admins can remove members from their workspace"
  ON public.workspace_members
  FOR DELETE
  USING (
    public.is_workspace_admin(workspace_id)
    -- Only owners can remove an owner
    AND (role != 'owner' OR public.is_workspace_owner(workspace_id))
    -- Prevent deleting the sole remaining owner of a workspace
    AND NOT (
      role = 'owner' AND
      (SELECT count(*) FROM public.workspace_members m WHERE m.workspace_id = workspace_members.workspace_id AND m.role = 'owner') <= 1
    )
  );

-- 5. Cross-Tenant Integrity on Activities
-- Ensure an activity cannot link to a lead belonging to a different workspace
DROP POLICY IF EXISTS "Members can insert activities in their workspace" ON public.activities;
CREATE POLICY "Members can insert activities in their workspace"
  ON public.activities
  FOR INSERT
  WITH CHECK (
    public.is_workspace_member(workspace_id)
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = activities.lead_id
        AND l.workspace_id = activities.workspace_id
    )
  );

DROP POLICY IF EXISTS "Members can update activities in their workspace" ON public.activities;
CREATE POLICY "Admins can update activities in their workspace"
  ON public.activities
  FOR UPDATE
  USING (public.is_workspace_admin(workspace_id))
  WITH CHECK (
    public.is_workspace_admin(workspace_id)
    AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = activities.lead_id
        AND l.workspace_id = activities.workspace_id
    )
  );

DROP POLICY IF EXISTS "Admins can delete activities in their workspace" ON public.activities;
CREATE POLICY "Admins can delete activities in their workspace"
  ON public.activities
  FOR DELETE
  USING (public.is_workspace_admin(workspace_id));

-- 6. Cross-Tenant Integrity on Tasks
-- Ensure task's workspace matches the lead's workspace if lead_id is present
DROP POLICY IF EXISTS "Members can insert tasks in their workspace" ON public.tasks;
CREATE POLICY "Members can insert tasks in their workspace"
  ON public.tasks
  FOR INSERT
  WITH CHECK (
    public.is_workspace_member(workspace_id)
    AND (
      lead_id IS NULL OR EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id = tasks.lead_id
          AND l.workspace_id = tasks.workspace_id
      )
    )
  );

DROP POLICY IF EXISTS "Members can update tasks in their workspace" ON public.tasks;
CREATE POLICY "Members can update tasks in their workspace"
  ON public.tasks
  FOR UPDATE
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (
    public.is_workspace_member(workspace_id)
    AND (
      lead_id IS NULL OR EXISTS (
        SELECT 1 FROM public.leads l
        WHERE l.id = tasks.lead_id
          AND l.workspace_id = tasks.workspace_id
      )
    )
  );

-- 7. AI Usage Hardening: Prevent Client-Side Token Usage Spoofing
-- Dropping client insert policy. AI usage must be recorded only by trusted server-side code.
DROP POLICY IF EXISTS "Members can record AI usage for their workspace" ON public.ai_usage;

-- 8. Subscriptions Hardening: Members only have SELECT; modifications restricted to service_role
-- Confirms no INSERT/UPDATE/DELETE policies exist for public/authenticated on subscriptions table
