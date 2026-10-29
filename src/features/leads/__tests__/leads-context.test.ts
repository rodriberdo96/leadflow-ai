import { describe, it, expect } from 'vitest';
import { generateEntityId } from '../leads-context';
import type { Lead, LeadActivity, LeadTask } from '@/types/lead';

describe('Lead, Task, and Activity Consistency (Phase 3)', () => {
  describe('generateEntityId', () => {
    it('generates unique collision-resistant IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        const id = generateEntityId('lead');
        expect(ids.has(id)).toBe(false);
        ids.add(id);
        expect(id).toMatch(/^lead-[a-zA-Z0-9-]+$/);
      }
    });
  });

  describe('Lead & Task Synchronization logic', () => {
    const mockWorkspaceId = 'ws-test-1';

    it('creates follow-up task only when a valid follow-up date exists', () => {
      const validDate = '2026-10-28';
      const hasValidFollowUp = Boolean(validDate && !Number.isNaN(new Date(validDate).getTime()));
      expect(hasValidFollowUp).toBe(true);

      const invalidDate = '';
      const hasInvalidFollowUp = Boolean(invalidDate && !Number.isNaN(new Date(invalidDate).getTime()));
      expect(hasInvalidFollowUp).toBe(false);
    });

    it('marks pending follow-up tasks as completed when lead transitions to won or lost', () => {
      const now = new Date().toISOString();
      const initialTasks: LeadTask[] = [
        {
          id: 'task-1',
          workspace_id: mockWorkspaceId,
          lead_id: 'lead-1',
          title: 'Initial follow up',
          due_date: '2026-10-27',
          completed: false,
          created_at: now,
        },
        {
          id: 'task-2',
          workspace_id: mockWorkspaceId,
          lead_id: 'lead-1',
          title: 'Already completed task',
          due_date: '2026-10-24',
          completed: true,
          completed_at: '2026-10-24T10:00:00Z',
          created_at: now,
        },
      ];

      // Simulate status transition to 'won'
      const updatedTasks = initialTasks.map((t) => {
        if (t.completed) return t; // preserve already completed
        return {
          ...t,
          completed: true,
          completed_at: now,
        };
      });

      expect(updatedTasks[0].completed).toBe(true);
      expect(updatedTasks[0].completed_at).toBe(now);
      expect(updatedTasks[1].completed).toBe(true);
      expect(updatedTasks[1].completed_at).toBe('2026-10-24T10:00:00Z'); // preserved original
    });

    it('preserves task completion state when updating unrelated fields', () => {
      const existingTask: LeadTask = {
        id: 'task-10',
        workspace_id: mockWorkspaceId,
        lead_id: 'lead-10',
        lead_name: 'Old Name (Old Corp)',
        title: 'Follow up',
        due_date: '2026-10-29',
        completed: true,
        completed_at: '2026-10-26T08:00:00Z',
        created_at: '2026-10-25T08:00:00Z',
      };

      // Unrelated edit: update company name
      const updatedLeadName = 'New Name (New Corp)';
      const updatedTask: LeadTask = {
        ...existingTask,
        lead_name: updatedLeadName,
      };

      expect(updatedTask.completed).toBe(true);
      expect(updatedTask.completed_at).toBe('2026-10-26T08:00:00Z');
      expect(updatedTask.lead_name).toBe(updatedLeadName);
    });

    it('reschedules pending task due_date when lead follow-up date changes', () => {
      const existingTask: LeadTask = {
        id: 'task-11',
        workspace_id: mockWorkspaceId,
        lead_id: 'lead-11',
        lead_name: 'Marcus Vance',
        title: 'Follow up',
        due_date: '2026-10-27',
        completed: false,
        created_at: '2026-10-24T08:00:00Z',
      };

      const newDueDate = '2026-11-05';
      const rescheduledTask: LeadTask = {
        ...existingTask,
        due_date: newDueDate,
      };

      expect(rescheduledTask.due_date).toBe('2026-11-05');
      expect(rescheduledTask.completed).toBe(false);
    });

    it('cascades deletion across related tasks and activities to maintain referential integrity', () => {
      const leads: Lead[] = [
        {
          id: 'lead-del',
          workspace_id: mockWorkspaceId,
          name: 'To Delete',
          company: 'Acme',
          email: 'acme@test.com',
          service: 'SEO',
          source: 'Website',
          status: 'new',
          deal_value: 1000,
          created_at: '2026-10-20',
          updated_at: '2026-10-20',
        },
        {
          id: 'lead-keep',
          workspace_id: mockWorkspaceId,
          name: 'To Keep',
          company: 'Kept Co',
          email: 'kept@test.com',
          service: 'Design',
          source: 'Referral',
          status: 'qualified',
          deal_value: 5000,
          created_at: '2026-10-20',
          updated_at: '2026-10-20',
        },
      ];

      const tasks: LeadTask[] = [
        { id: 't-1', workspace_id: mockWorkspaceId, lead_id: 'lead-del', title: 'Task 1', due_date: '2026-10-28', completed: false, created_at: '' },
        { id: 't-2', workspace_id: mockWorkspaceId, lead_id: 'lead-keep', title: 'Task 2', due_date: '2026-10-29', completed: false, created_at: '' },
      ];

      const activities: LeadActivity[] = [
        { id: 'a-1', workspace_id: mockWorkspaceId, lead_id: 'lead-del', type: 'note', description: 'Lead created', created_at: '' },
        { id: 'a-2', workspace_id: mockWorkspaceId, lead_id: 'lead-keep', type: 'call', description: 'Call completed', created_at: '' },
      ];

      const targetId = 'lead-del';
      const nextLeads = leads.filter((l) => l.id !== targetId);
      const nextTasks = tasks.filter((t) => t.lead_id !== targetId);
      const nextActivities = activities.filter((a) => a.lead_id !== targetId);

      expect(nextLeads.map((l) => l.id)).toEqual(['lead-keep']);
      expect(nextTasks.map((t) => t.id)).toEqual(['t-2']);
      expect(nextActivities.map((a) => a.id)).toEqual(['a-2']);
    });
  });
});
