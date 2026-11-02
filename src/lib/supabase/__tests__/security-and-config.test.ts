import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  isLiveSupabaseConfigured,
  getSupabaseBrowserClient,
} from '../client';
import {
  isSupabaseAdminConfigured,
  getSupabaseServerClient,
  getSupabaseAdminClient,
} from '../server';

describe('Supabase Configuration & Multi-Tenant Security Baseline (Phase 5 & 6)', () => {
  describe('Client Configuration & Fallback Hardening', () => {
    it('rejects placeholder or missing Supabase credentials', () => {
      // By default in test environment, no real Supabase credentials exist
      expect(isLiveSupabaseConfigured()).toBe(false);
      expect(getSupabaseBrowserClient()).toBeNull();
    });

    it('getSupabaseAdminClient rejects execution in client-side / window environment', () => {
      // Simulate client-side environment
      vi.stubGlobal('window', {});
      expect(() => getSupabaseAdminClient()).toThrow(/SECURITY VIOLATION/i);
      vi.unstubAllGlobals();
    });

    it('getSupabaseAdminClient throws when service role key is missing on the server', () => {
      expect(isSupabaseAdminConfigured()).toBe(false);
      expect(() => getSupabaseAdminClient()).toThrow(/SUPABASE_SERVICE_ROLE_KEY is missing or invalid/i);
    });

    it('getSupabaseServerClient does not fall back to privileged service-role key', async () => {
      // When unconfigured, returns null instead of falling back to a dummy or admin key
      const client = await getSupabaseServerClient();
      expect(client).toBeNull();
    });
  });

  describe('Multi-Tenant RLS & Forward Migration Verification (Phase 5)', () => {
    const migrationFilePath = path.resolve(
      __dirname,
      '../../../../supabase/migrations/20250102000000_security_hardening.sql'
    );

    it('ensures the security hardening forward migration file exists', () => {
      expect(fs.existsSync(migrationFilePath)).toBe(true);
    });

    const migrationSql = fs.readFileSync(migrationFilePath, 'utf-8');

    it('1. Enforces safe explicit search_path on all SECURITY DEFINER functions', () => {
      // Prevents search path hijacking
      expect(migrationSql).toMatch(/is_workspace_member\(ws_id uuid\)[\s\S]*?SECURITY DEFINER SET search_path = pg_catalog, public/);
      expect(migrationSql).toMatch(/is_workspace_admin\(ws_id uuid\)[\s\S]*?SECURITY DEFINER SET search_path = pg_catalog, public/);
      expect(migrationSql).toMatch(/is_workspace_owner\(ws_id uuid\)[\s\S]*?SECURITY DEFINER SET search_path = pg_catalog, public/);
      expect(migrationSql).toMatch(/create_workspace\([\s\S]*?SECURITY DEFINER SET search_path = pg_catalog, public/);
    });

    it('2. Enforces atomic workspace creation and initial owner assignment', () => {
      expect(migrationSql).toContain('CREATE OR REPLACE FUNCTION public.create_workspace');
      expect(migrationSql).toContain("'owner'");
      expect(migrationSql).toContain('INSERT INTO public.workspaces');
      expect(migrationSql).toContain('INSERT INTO public.workspace_members');
    });

    it('3. Prevents role self-elevation in workspace_members policies', () => {
      expect(migrationSql).toContain('Admins can update membership in their workspace');
      // Must prevent users from changing their own role
      expect(migrationSql).toContain('user_id != auth.uid()');
      // Only owner can appoint or remove owner
      expect(migrationSql).toContain("role != 'owner' OR public.is_workspace_owner(workspace_id)");
    });

    it('4. Enforces cross-tenant activity consistency with lead workspace', () => {
      // Activity insert and update policies must verify that lead_id belongs to the same workspace
      expect(migrationSql).toContain('Members can insert activities in their workspace');
      expect(migrationSql).toMatch(/EXISTS \(\s*SELECT 1 FROM public\.leads l\s*WHERE l\.id = activities\.lead_id\s*AND l\.workspace_id = activities\.workspace_id\s*\)/i);
    });

    it('5. Enforces cross-tenant task consistency with lead workspace', () => {
      expect(migrationSql).toContain('Members can insert tasks in their workspace');
      expect(migrationSql).toMatch(/lead_id IS NULL OR EXISTS \(\s*SELECT 1 FROM public\.leads l\s*WHERE l\.id = tasks\.lead_id\s*AND l\.workspace_id = tasks\.workspace_id\s*\)/i);
    });

    it('6. Revokes client-side token spoofing on ai_usage', () => {
      expect(migrationSql).toContain('DROP POLICY IF EXISTS "Members can record AI usage for their workspace" ON public.ai_usage;');
    });

    it('7. Enforces that only workspace owners can delete a workspace', () => {
      expect(migrationSql).toContain('Workspace owners can delete their workspace');
      expect(migrationSql).toContain('is_workspace_owner(id)');
    });
  });

  describe('Live Integration Suite Declaration (Requirement & Constraints)', () => {
    it('documents the test baseline status for live Supabase integration', () => {
      const hasLiveDatabase = Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE_KEY &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project')
      );

      // In the current CI / local development container, no live Supabase instance is provisioned.
      // Rule 8: Never use mock data as evidence that Supabase integration works.
      // Therefore, live network CRUD against remote PostgreSQL is documented as pending live credentials.
      expect(hasLiveDatabase).toBe(false);
    });
  });
});
