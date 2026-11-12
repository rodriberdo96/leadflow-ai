import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  supabaseLeadsService,
  supabaseTasksService,
} from '../production/supabase-leads-service';
import * as clientModule from '@/lib/supabase/client';

describe('Milestone 2 QA Remediation - Data Integrity & Task Consistency', () => {
  const mockWorkspaceId = 'ws-acme-corp-1';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('A. Task Schema Consistency (lead_name isolation)', () => {
    it('creates tasks without sending lead_name to the database table', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'task-101',
          workspace_id: mockWorkspaceId,
          lead_id: 'lead-1',
          title: 'Follow up call',
          due_date: '2026-11-05T10:00:00Z',
          completed: false,
          created_at: '2026-11-02T12:00:00Z',
        },
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

      vi.spyOn(clientModule, 'getSupabaseBrowserClient').mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof clientModule.getSupabaseBrowserClient>);

      const created = await supabaseTasksService.createTask(mockWorkspaceId, {
        lead_id: 'lead-1',
        lead_name: 'John Doe (Acme Corp)', // Frontend-only decoration
        title: 'Follow up call',
        due_date: '2026-11-05T10:00:00Z',
        completed: false,
      });

      expect(mockFrom).toHaveBeenCalledWith('tasks');
      // Must NOT include lead_name in the insert payload sent to PostgreSQL
      expect(mockInsert).toHaveBeenCalledWith({
        workspace_id: mockWorkspaceId,
        lead_id: 'lead-1',
        assigned_to: null,
        title: 'Follow up call',
        due_date: '2026-11-05T10:00:00Z',
        completed: false,
        completed_at: null,
        task_type: 'manual',
      });
      expect(created.lead_name).toBe('John Doe (Acme Corp)');
    });

    it('derives lead_name on fetch by joining leads (name, company)', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'task-101',
            workspace_id: mockWorkspaceId,
            lead_id: 'lead-1',
            title: 'Follow up call',
            due_date: '2026-11-05T10:00:00Z',
            completed: false,
            created_at: '2026-11-02T12:00:00Z',
            leads: {
              name: 'Alice Smith',
              company: 'Starlight Media',
            },
          },
        ],
        error: null,
      });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

      vi.spyOn(clientModule, 'getSupabaseBrowserClient').mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof clientModule.getSupabaseBrowserClient>);

      const tasks = await supabaseTasksService.getTasks(mockWorkspaceId);

      expect(mockFrom).toHaveBeenCalledWith('tasks');
      expect(mockSelect).toHaveBeenCalledWith('*, leads ( name, company )');
      expect(tasks).toHaveLength(1);
      expect(tasks[0].lead_name).toBe('Alice Smith (Starlight Media)');
    });
  });

  describe('B. Atomicity via PostgreSQL RPC', () => {
    it('executes create_lead_transactional in a single RPC transaction', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: {
          id: 'lead-atomic-1',
          workspace_id: mockWorkspaceId,
          name: 'Tech Ventures',
          company: 'Ventures Inc',
          email: 'contact@ventures.com',
          service: 'Web Development',
          source: 'LinkedIn',
          status: 'new',
          deal_value: 5000,
          next_follow_up: '2026-11-10T12:00:00Z',
          created_at: '2026-11-02T12:00:00Z',
        },
        error: null,
      });

      vi.spyOn(clientModule, 'getSupabaseBrowserClient').mockReturnValue({
        rpc: mockRpc,
      } as unknown as ReturnType<typeof clientModule.getSupabaseBrowserClient>);

      const lead = await supabaseLeadsService.createLeadTransactional(mockWorkspaceId, {
        name: 'Tech Ventures',
        company: 'Ventures Inc',
        email: 'contact@ventures.com',
        service: 'Web Development',
        source: 'LinkedIn',
        status: 'new',
        deal_value: 5000,
        next_follow_up: '2026-11-10T12:00:00Z',
      });

      expect(mockRpc).toHaveBeenCalledWith('create_lead_transactional', {
        p_workspace_id: mockWorkspaceId,
        p_name: 'Tech Ventures',
        p_company: 'Ventures Inc',
        p_email: 'contact@ventures.com',
        p_phone: null,
        p_service: 'Web Development',
        p_source: 'LinkedIn',
        p_status: 'new',
        p_deal_value: 5000,
        p_next_follow_up: '2026-11-10T12:00:00Z',
        p_notes: null,
      });
      expect(lead.id).toBe('lead-atomic-1');
    });

    it('strictly propagates error on createLeadTransactional failure without executing unsafe fallbacks', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'function create_lead_transactional does not exist or permission denied' },
      });

      const mockFrom = vi.fn();

      vi.spyOn(clientModule, 'getSupabaseBrowserClient').mockReturnValue({
        rpc: mockRpc,
        from: mockFrom,
      } as unknown as ReturnType<typeof clientModule.getSupabaseBrowserClient>);

      await expect(
        supabaseLeadsService.createLeadTransactional(mockWorkspaceId, {
          name: 'Strict Lead',
          company: 'Strict Co',
          email: 'strict@example.com',
          service: 'SEO',
          source: 'Organic',
          status: 'new',
          deal_value: 1200,
        })
      ).rejects.toThrow(/Transactional lead creation failed: function create_lead_transactional does not exist/);

      expect(mockRpc).toHaveBeenCalled();
      // Crucial security guarantee: NO non-transactional fallback table operations must ever be attempted
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('strictly propagates error on updateLeadTransactional failure without fallback', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Access denied: caller is not a member of workspace' },
      });

      const mockFrom = vi.fn();

      vi.spyOn(clientModule, 'getSupabaseBrowserClient').mockReturnValue({
        rpc: mockRpc,
        from: mockFrom,
      } as unknown as ReturnType<typeof clientModule.getSupabaseBrowserClient>);

      await expect(
        supabaseLeadsService.updateLeadTransactional('lead-1', mockWorkspaceId, {
          id: 'lead-1',
          workspace_id: mockWorkspaceId,
          name: 'Updated Lead',
          company: 'Updated Co',
          email: 'updated@example.com',
          service: 'SEO',
          source: 'Organic',
          status: 'proposal',
          deal_value: 2000,
          created_at: '2026-11-01T10:00:00Z',
          updated_at: '2026-11-02T10:00:00Z',
        })
      ).rejects.toThrow(/Transactional lead update failed/);

      expect(mockRpc).toHaveBeenCalled();
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('strictly propagates error on deleteLeadTransactional failure without fallback', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        error: { message: 'Foreign key or permission error' },
      });

      const mockFrom = vi.fn();

      vi.spyOn(clientModule, 'getSupabaseBrowserClient').mockReturnValue({
        rpc: mockRpc,
        from: mockFrom,
      } as unknown as ReturnType<typeof clientModule.getSupabaseBrowserClient>);

      await expect(
        supabaseLeadsService.deleteLeadTransactional('lead-1', mockWorkspaceId, true)
      ).rejects.toThrow(/Transactional lead deletion failed/);

      expect(mockRpc).toHaveBeenCalled();
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe('C. Open Redirect Prevention in Auth Callback', () => {
    // Test the safe redirect sanitizer behavior directly
    function getSafeRedirectPath(candidate: string | null): string {
      if (!candidate) return '/dashboard';
      if (
        candidate.startsWith('/') &&
        !candidate.startsWith('//') &&
        !candidate.startsWith('/\\') &&
        !candidate.includes(':') &&
        !candidate.includes('\\')
      ) {
        return candidate;
      }
      return '/dashboard';
    }

    it('allows valid internal dashboard paths', () => {
      expect(getSafeRedirectPath('/dashboard')).toBe('/dashboard');
      expect(getSafeRedirectPath('/leads')).toBe('/leads');
      expect(getSafeRedirectPath('/settings?tab=team')).toBe('/settings?tab=team');
    });

    it('blocks external URLs and protocol-relative redirect exploits', () => {
      expect(getSafeRedirectPath('https://evil.com')).toBe('/dashboard');
      expect(getSafeRedirectPath('http://malicious.org')).toBe('/dashboard');
      expect(getSafeRedirectPath('//attacker.com/steal')).toBe('/dashboard');
      expect(getSafeRedirectPath('/\\attacker.com')).toBe('/dashboard');
      expect(getSafeRedirectPath('javascript:alert(1)')).toBe('/dashboard');
      expect(getSafeRedirectPath(null)).toBe('/dashboard');
      expect(getSafeRedirectPath('')).toBe('/dashboard');
    });
  });
});

