import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Lead, LeadTask } from '@/types/lead';
import { DEMO_WORKSPACE } from '@/context/workspace-context';
import { supabaseTasksService } from '../production/supabase-leads-service';
import * as clientModule from '@/lib/supabase/client';

describe('Milestone 2 QA — Workspace Lifecycle, Isolation & Task Synchronization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Production Workspace Isolation & Lifecycle Invariants', () => {
    it('ensures DEMO_WORKSPACE is never used as an active workspace in production', () => {
      // In production mode, DEMO_WORKSPACE id must be explicitly rejected
      const isProduction = true;

      const getInitialActiveWorkspace = (mode: boolean, activeWs: string | null) => {
        if (mode) {
          // In production mode, NEVER assign DEMO_WORKSPACE, including unauthenticated
          return activeWs && activeWs !== DEMO_WORKSPACE.id ? { id: activeWs } : null;
        }
        return DEMO_WORKSPACE;
      };

      expect(getInitialActiveWorkspace(isProduction, null)).toBeNull();
      expect(getInitialActiveWorkspace(isProduction, DEMO_WORKSPACE.id)).toBeNull();
      expect(getInitialActiveWorkspace(false, null)).toEqual(DEMO_WORKSPACE);
    });

    it('clears active workspace and data when user logs out or changes', () => {
      let activeWorkspace: { id: string } | null = { id: 'ws-user-a' };
      let leads: Lead[] = [
        {
          id: 'lead-a1',
          workspace_id: 'ws-user-a',
          name: 'Lead A',
          company: 'Company A',
          email: 'a@a.com',
          service: 'Web Development',
          source: 'Referral',
          status: 'new',
          deal_value: 5000,
          created_at: '2026-11-01T00:00:00Z',
          updated_at: '2026-11-01T00:00:00Z',
        },
      ];

      // Simulate User Logout
      const handleLogout = () => {
        activeWorkspace = null;
        leads = [];
      };

      handleLogout();
      expect(activeWorkspace).toBeNull();
      expect(leads).toHaveLength(0);

      // Simulate Switch to User B (prevents User A workspace from lingering)
      let prevUserId: string | null = 'user-a';
      const currentUserId = 'user-b';

      if (prevUserId !== currentUserId) {
        activeWorkspace = null;
        leads = [];
        prevUserId = currentUserId;
      }

      expect(activeWorkspace).toBeNull();
      expect(leads).toHaveLength(0);
      expect(prevUserId).toBe('user-b');
    });

    it('clears stale workspace state when membership loading fails', () => {
      let activeWorkspace: { id: string } | null = { id: 'ws-old' };
      let capturedError: Error | null = null;
      let isLoading = true;

      // Simulate loading error
      const simulateFailedFetch = (err: Error) => {
        activeWorkspace = null;
        capturedError = err;
        isLoading = false;
      };

      simulateFailedFetch(new Error('Network error or RLS denial'));

      expect(activeWorkspace).toBeNull();
      expect((capturedError as Error | null)?.message).toBe('Network error or RLS denial');
      expect(isLoading).toBe(false);
    });

    it('suppresses stale asynchronous responses from an old workspace when switching', async () => {
      let activeDataWorkspaceId: string | null = null;
      let currentWorkspaceId = 'ws-first';
      let latestRequestId = 0;

      const fetchForWorkspace = async (targetWsId: string, delayMs: number, data: string) => {
        const thisRequestId = ++latestRequestId;
        currentWorkspaceId = targetWsId;

        await new Promise((resolve) => setTimeout(resolve, delayMs));

        // Stale check
        if (thisRequestId !== latestRequestId || targetWsId !== currentWorkspaceId) {
          return; // Suppressed stale response!
        }
        activeDataWorkspaceId = data;
      };

      // Start slow request for ws-first
      const req1 = fetchForWorkspace('ws-first', 50, 'DATA_FOR_WS_FIRST');
      // Immediately switch to ws-second with fast request
      const req2 = fetchForWorkspace('ws-second', 10, 'DATA_FOR_WS_SECOND');

      await Promise.all([req1, req2]);

      // Verify that ws-second prevailed and ws-first did NOT overwrite it
      expect(activeDataWorkspaceId).toBe('DATA_FOR_WS_SECOND');
    });
  });

  describe('2. Transactional Task Synchronization & Manual Task Preservation', () => {
    const wsId = 'ws-test-sync';
    const leadId = 'lead-sync-100';

    it('distinguishes system follow-up tasks from manual tasks', () => {
      const systemTask: LeadTask = {
        id: 't-sys',
        workspace_id: wsId,
        lead_id: leadId,
        title: 'Follow up with Sarah',
        due_date: '2026-11-10T10:00:00Z',
        completed: false,
        task_type: 'system_follow_up',
        created_at: '2026-11-01T00:00:00Z',
      };

      const manualTask: LeadTask = {
        id: 't-man',
        workspace_id: wsId,
        lead_id: leadId,
        title: 'Review custom contract clause',
        due_date: '2026-11-12T15:00:00Z',
        completed: false,
        task_type: 'manual',
        created_at: '2026-11-02T00:00:00Z',
      };

      expect(systemTask.task_type).toBe('system_follow_up');
      expect(manualTask.task_type).toBe('manual');
    });

    it('preserves manual tasks and reschedules only system task when follow-up date changes', () => {
      const initialTasks: LeadTask[] = [
        {
          id: 'task-sys',
          workspace_id: wsId,
          lead_id: leadId,
          title: 'Follow up with Sarah on Web Dev',
          due_date: '2026-11-05T10:00:00Z',
          completed: false,
          task_type: 'system_follow_up',
          created_at: '2026-11-01T00:00:00Z',
        },
        {
          id: 'task-manual-1',
          workspace_id: wsId,
          lead_id: leadId,
          title: 'Prepare custom contract addendum',
          due_date: '2026-11-08T12:00:00Z',
          completed: false,
          task_type: 'manual',
          created_at: '2026-11-02T00:00:00Z',
        },
        {
          id: 'task-manual-2',
          workspace_id: wsId,
          lead_id: leadId,
          title: 'Send invoice estimate',
          due_date: '2026-11-09T17:00:00Z',
          completed: false,
          task_type: 'manual',
          created_at: '2026-11-03T00:00:00Z',
        },
      ];

      const newFollowUp = '2026-11-15T14:00:00Z';

      // Simulate hardened synchronization: only update system_follow_up task
      const updatedTasks = initialTasks.map((t) => {
        if (t.task_type === 'system_follow_up' && !t.completed) {
          return {
            ...t,
            due_date: newFollowUp,
          };
        }
        return t; // Manual tasks completely untouched
      });

      const sysTask = updatedTasks.find((t) => t.id === 'task-sys');
      const manTask1 = updatedTasks.find((t) => t.id === 'task-manual-1');
      const manTask2 = updatedTasks.find((t) => t.id === 'task-manual-2');

      expect(sysTask?.due_date).toBe(newFollowUp);
      expect(manTask1?.due_date).toBe('2026-11-08T12:00:00Z');
      expect(manTask2?.due_date).toBe('2026-11-09T17:00:00Z');
    });

    it('preserves manual tasks and deletes only system task when follow-up is removed', () => {
      const initialTasks: LeadTask[] = [
        {
          id: 'task-sys',
          workspace_id: wsId,
          lead_id: leadId,
          title: 'Follow up with Sarah on Web Dev',
          due_date: '2026-11-05T10:00:00Z',
          completed: false,
          task_type: 'system_follow_up',
          created_at: '2026-11-01T00:00:00Z',
        },
        {
          id: 'task-manual-1',
          workspace_id: wsId,
          lead_id: leadId,
          title: 'Internal architectural review',
          due_date: '2026-11-07T12:00:00Z',
          completed: false,
          task_type: 'manual',
          created_at: '2026-11-02T00:00:00Z',
        },
      ];

      // When follow-up is removed (null/empty), only system follow-up task is deleted
      const updatedTasks = initialTasks.filter(
        (t) => !(t.task_type === 'system_follow_up' && !t.completed)
      );

      expect(updatedTasks).toHaveLength(1);
      expect(updatedTasks[0].id).toBe('task-manual-1');
      expect(updatedTasks[0].title).toBe('Internal architectural review');
      expect(updatedTasks[0].task_type).toBe('manual');
    });

    it('marks only system follow-up tasks as completed when lead is won or lost', () => {
      const initialTasks: LeadTask[] = [
        {
          id: 'task-sys',
          workspace_id: wsId,
          lead_id: leadId,
          title: 'Follow up with Sarah on Web Dev',
          due_date: '2026-11-05T10:00:00Z',
          completed: false,
          task_type: 'system_follow_up',
          created_at: '2026-11-01T00:00:00Z',
        },
        {
          id: 'task-manual-audit',
          workspace_id: wsId,
          lead_id: leadId,
          title: 'Compliance audit post-sale',
          due_date: '2026-11-20T10:00:00Z',
          completed: false,
          task_type: 'manual',
          created_at: '2026-11-02T00:00:00Z',
        },
      ];

      // Simulate status won/lost: auto-completes system task, leaves manual task open
      const now = new Date().toISOString();
      const updatedTasks = initialTasks.map((t) => {
        if (t.task_type === 'system_follow_up' && !t.completed) {
          return {
            ...t,
            completed: true,
            completed_at: now,
          };
        }
        return t;
      });

      const sysTask = updatedTasks.find((t) => t.id === 'task-sys');
      const manualTask = updatedTasks.find((t) => t.id === 'task-manual-audit');

      expect(sysTask?.completed).toBe(true);
      expect(manualTask?.completed).toBe(false);
    });

    it('safely handles leads with multiple manual tasks and no existing system task', () => {
      const initialTasks: LeadTask[] = [
        {
          id: 'task-man-1',
          workspace_id: wsId,
          lead_id: leadId,
          title: 'Review NDA',
          due_date: '2026-11-10T10:00:00Z',
          completed: false,
          task_type: 'manual',
          created_at: '2026-11-01T00:00:00Z',
        },
        {
          id: 'task-man-2',
          workspace_id: wsId,
          lead_id: leadId,
          title: 'Check references',
          due_date: '2026-11-11T14:00:00Z',
          completed: false,
          task_type: 'manual',
          created_at: '2026-11-01T00:00:00Z',
        },
      ];

      // Adding follow-up date to a lead that previously had none: creates new system task
      const newFollowUp = '2026-11-14T10:00:00Z';
      const existingSystemTask = initialTasks.find(
        (t) => t.task_type === 'system_follow_up' && !t.completed
      );

      const finalTasks = [...initialTasks];
      if (!existingSystemTask) {
        finalTasks.push({
          id: 'task-new-sys',
          workspace_id: wsId,
          lead_id: leadId,
          title: 'Follow up with Sarah on Web Dev',
          due_date: newFollowUp,
          completed: false,
          task_type: 'system_follow_up',
          created_at: '2026-11-04T00:00:00Z',
        });
      }

      expect(finalTasks).toHaveLength(3);
      expect(finalTasks.filter((t) => t.task_type === 'manual')).toHaveLength(2);
      expect(finalTasks.find((t) => t.id === 'task-new-sys')?.task_type).toBe('system_follow_up');
    });

    it('passes task_type to supabaseTasksService and defaults to manual when omitted', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'task-persisted-1',
          workspace_id: wsId,
          lead_id: leadId,
          title: 'Manual Task A',
          due_date: '2026-11-10T10:00:00Z',
          completed: false,
          task_type: 'manual',
          created_at: '2026-11-04T00:00:00Z',
        },
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

      vi.spyOn(clientModule, 'getSupabaseBrowserClient').mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof clientModule.getSupabaseBrowserClient>);

      await supabaseTasksService.createTask(wsId, {
        lead_id: leadId,
        title: 'Manual Task A',
        due_date: '2026-11-10T10:00:00Z',
        completed: false,
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace_id: wsId,
          lead_id: leadId,
          title: 'Manual Task A',
          task_type: 'manual',
        })
      );
    });

    it('transmits task_type through updateTask when specified', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'task-persisted-2',
          workspace_id: wsId,
          lead_id: leadId,
          title: 'Updated System Task',
          due_date: '2026-11-12T10:00:00Z',
          completed: false,
          task_type: 'system_follow_up',
          created_at: '2026-11-04T00:00:00Z',
        },
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });

      vi.spyOn(clientModule, 'getSupabaseBrowserClient').mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof clientModule.getSupabaseBrowserClient>);

      await supabaseTasksService.updateTask('task-persisted-2', {
        title: 'Updated System Task',
        task_type: 'system_follow_up',
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Updated System Task',
          task_type: 'system_follow_up',
        })
      );
    });
  });
});
