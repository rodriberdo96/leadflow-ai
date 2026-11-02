-- ==============================================================================
-- LeadFlow AI - Migration: Milestone 2 QA Remediation & Hardening
-- Migration ID: 20250103000000_milestone2_remediation.sql
-- ==============================================================================

-- 1. Relax NOT NULL on activities.lead_id to enable retention of historical audit logs
-- when a lead is deleted (business policy: preserve workspace audit trail).
ALTER TABLE public.activities ALTER COLUMN lead_id DROP NOT NULL;

-- Ensure foreign key sets lead_id to NULL on delete instead of cascading audit loss
ALTER TABLE public.activities 
  DROP CONSTRAINT IF EXISTS activities_lead_id_fkey,
  ADD CONSTRAINT activities_lead_id_fkey 
    FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;

-- 2. Non-Recursive Helper Functions for workspace_members RLS Policies
-- Solves infinite recursion in PostgreSQL when evaluating policies on workspace_members.
CREATE OR REPLACE FUNCTION public.get_user_workspace_role(ws_id uuid, uid uuid DEFAULT auth.uid())
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM public.workspace_members
  WHERE workspace_id = ws_id AND user_id = uid;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public;

CREATE OR REPLACE FUNCTION public.count_workspace_owners(ws_id uuid)
RETURNS bigint AS $$
DECLARE
  v_count bigint;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.workspace_members
  WHERE workspace_id = ws_id AND role = 'owner';
  RETURN v_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.get_user_workspace_role(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.count_workspace_owners(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_user_workspace_role(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.count_workspace_owners(uuid) TO authenticated, service_role;

-- 3. Hardened RLS Policies on workspace_members (No Recursive Subqueries)
DROP POLICY IF EXISTS "Admins can update membership in their workspace" ON public.workspace_members;
CREATE POLICY "Admins can update membership in their workspace"
  ON public.workspace_members
  FOR UPDATE
  USING (
    public.is_workspace_admin(workspace_id)
    AND (role != 'owner' OR public.is_workspace_owner(workspace_id))
  )
  WITH CHECK (
    public.is_workspace_admin(workspace_id)
    -- Prevent self-role elevation or role updates
    AND (user_id != auth.uid() OR role = public.get_user_workspace_role(workspace_id, auth.uid()))
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
    -- Prevent removing the sole remaining owner of a workspace
    AND NOT (
      role = 'owner' AND public.count_workspace_owners(workspace_id) <= 1
    )
  );

-- 4. Atomic Stored Procedure: create_lead_transactional
-- Guarantees atomic insertion of Lead + Initial Activity + Follow-up Task
CREATE OR REPLACE FUNCTION public.create_lead_transactional(
  p_workspace_id uuid,
  p_name text,
  p_company text,
  p_email text,
  p_phone text,
  p_service text,
  p_source text,
  p_status text,
  p_deal_value numeric,
  p_next_follow_up timestamptz,
  p_notes text
) RETURNS jsonb AS $$
DECLARE
  v_lead_id uuid;
  v_created_lead jsonb;
  v_user_id uuid := auth.uid();
BEGIN
  IF NOT public.is_workspace_member(p_workspace_id) THEN
    RAISE EXCEPTION 'Access denied: caller is not a member of workspace %', p_workspace_id;
  END IF;

  INSERT INTO public.leads (
    workspace_id, name, company, email, phone,
    service, source, status, deal_value, next_follow_up, notes, assigned_to
  ) VALUES (
    p_workspace_id, trim(p_name), trim(p_company), trim(p_email), nullif(trim(p_phone), ''),
    trim(p_service), trim(p_source), p_status, coalesce(p_deal_value, 0), p_next_follow_up, nullif(trim(p_notes), ''), v_user_id
  ) RETURNING id INTO v_lead_id;

  -- Atomic initial activity record
  INSERT INTO public.activities (
    workspace_id, lead_id, user_id, type, description, metadata
  ) VALUES (
    p_workspace_id,
    v_lead_id,
    v_user_id,
    'note',
    format('Lead created for %s (%s)', trim(p_company), trim(p_service)),
    jsonb_build_object('lead_name', trim(p_name), 'company', trim(p_company), 'action', 'create')
  );

  -- Atomic follow-up task if date scheduled
  IF p_next_follow_up IS NOT NULL THEN
    INSERT INTO public.tasks (
      workspace_id, lead_id, assigned_to, title, due_date, completed
    ) VALUES (
      p_workspace_id,
      v_lead_id,
      v_user_id,
      format('Follow up with %s on %s', trim(p_name), trim(p_service)),
      p_next_follow_up,
      false
    );
  END IF;

  SELECT to_jsonb(l) INTO v_created_lead
  FROM public.leads l
  WHERE l.id = v_lead_id;

  RETURN v_created_lead;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- 5. Atomic Stored Procedure: update_lead_transactional
-- Guarantees atomic update of Lead + Status Activity + Task sync (Won/Lost/Rescheduled)
CREATE OR REPLACE FUNCTION public.update_lead_transactional(
  p_lead_id uuid,
  p_workspace_id uuid,
  p_name text,
  p_company text,
  p_email text,
  p_phone text,
  p_service text,
  p_source text,
  p_status text,
  p_deal_value numeric,
  p_next_follow_up timestamptz,
  p_notes text
) RETURNS jsonb AS $$
DECLARE
  v_old_status text;
  v_old_follow_up timestamptz;
  v_updated_lead jsonb;
  v_user_id uuid := auth.uid();
BEGIN
  IF NOT public.is_workspace_member(p_workspace_id) THEN
    RAISE EXCEPTION 'Access denied: caller is not a member of workspace %', p_workspace_id;
  END IF;

  SELECT status, next_follow_up INTO v_old_status, v_old_follow_up
  FROM public.leads
  WHERE id = p_lead_id AND workspace_id = p_workspace_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found in workspace %', p_workspace_id;
  END IF;

  UPDATE public.leads
  SET
    name = trim(p_name),
    company = trim(p_company),
    email = trim(p_email),
    phone = nullif(trim(p_phone), ''),
    service = trim(p_service),
    source = trim(p_source),
    status = p_status,
    deal_value = coalesce(p_deal_value, 0),
    next_follow_up = p_next_follow_up,
    notes = nullif(trim(p_notes), ''),
    updated_at = now()
  WHERE id = p_lead_id AND workspace_id = p_workspace_id;

  -- Record status change activity exactly once
  IF v_old_status IS DISTINCT FROM p_status THEN
    INSERT INTO public.activities (
      workspace_id, lead_id, user_id, type, description, metadata
    ) VALUES (
      p_workspace_id,
      p_lead_id,
      v_user_id,
      'status_change',
      format('Status changed from %s to %s', v_old_status, p_status),
      jsonb_build_object('from_status', v_old_status, 'to_status', p_status, 'lead_name', trim(p_name))
    );

    -- Mark active tasks as complete when closed won or lost
    IF p_status IN ('won', 'lost') THEN
      UPDATE public.tasks
      SET completed = true, completed_at = now(), updated_at = now()
      WHERE lead_id = p_lead_id AND workspace_id = p_workspace_id AND completed = false;
    END IF;
  END IF;

  -- Synchronize follow-up task
  IF v_old_follow_up IS DISTINCT FROM p_next_follow_up THEN
    IF p_next_follow_up IS NULL THEN
      DELETE FROM public.tasks
      WHERE lead_id = p_lead_id AND workspace_id = p_workspace_id AND completed = false;
    ELSE
      IF EXISTS (
        SELECT 1 FROM public.tasks
        WHERE lead_id = p_lead_id AND workspace_id = p_workspace_id AND completed = false
      ) THEN
        UPDATE public.tasks
        SET due_date = p_next_follow_up, updated_at = now()
        WHERE lead_id = p_lead_id AND workspace_id = p_workspace_id AND completed = false;
      ELSE
        INSERT INTO public.tasks (
          workspace_id, lead_id, assigned_to, title, due_date, completed
        ) VALUES (
          p_workspace_id,
          p_lead_id,
          v_user_id,
          format('Follow up with %s on %s', trim(p_name), trim(p_service)),
          p_next_follow_up,
          false
        );
      END IF;
    END IF;
  END IF;

  SELECT to_jsonb(l) INTO v_updated_lead
  FROM public.leads l
  WHERE l.id = p_lead_id;

  RETURN v_updated_lead;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- 6. Atomic Stored Procedure: delete_lead_transactional
-- Guarantees atomic deletion of Lead + cleanup of pending tasks + preservation of workspace audit trail
CREATE OR REPLACE FUNCTION public.delete_lead_transactional(
  p_lead_id uuid,
  p_workspace_id uuid,
  p_preserve_activities boolean DEFAULT true
) RETURNS boolean AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_lead_name text;
  v_lead_company text;
BEGIN
  IF NOT public.is_workspace_member(p_workspace_id) THEN
    RAISE EXCEPTION 'Access denied: caller is not a member of workspace %', p_workspace_id;
  END IF;

  SELECT name, company INTO v_lead_name, v_lead_company
  FROM public.leads
  WHERE id = p_lead_id AND workspace_id = p_workspace_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Clean up pending tasks for this lead (prevents orphaned tasks)
  DELETE FROM public.tasks
  WHERE lead_id = p_lead_id AND workspace_id = p_workspace_id;

  IF p_preserve_activities THEN
    -- Retain workspace audit history by disassociating foreign key
    UPDATE public.activities
    SET lead_id = NULL,
        metadata = metadata || jsonb_build_object('archived_lead_name', v_lead_name, 'archived_company', v_lead_company)
    WHERE lead_id = p_lead_id AND workspace_id = p_workspace_id;
  END IF;

  DELETE FROM public.leads
  WHERE id = p_lead_id AND workspace_id = p_workspace_id;

  -- Record audit log for lead deletion in workspace
  INSERT INTO public.activities (
    workspace_id, lead_id, user_id, type, description, metadata
  ) VALUES (
    p_workspace_id,
    NULL,
    v_user_id,
    'note',
    format('Lead %s (%s) was deleted', v_lead_name, v_lead_company),
    jsonb_build_object('deleted_lead_name', v_lead_name, 'deleted_company', v_lead_company, 'action', 'delete')
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.create_lead_transactional FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_lead_transactional FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_lead_transactional FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_lead_transactional TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_lead_transactional TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_lead_transactional TO authenticated;

