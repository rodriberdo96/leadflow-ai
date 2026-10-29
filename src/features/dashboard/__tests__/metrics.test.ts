import { describe, it, expect } from 'vitest';
import {
  computeDashboardMetrics,
  categorizeFollowUp,
  FOLLOW_UP_WINDOW_MS,
} from '../mock-data';
import type { Lead } from '@/types/lead';

describe('Follow-up metrics & Dashboard calculations (Phase 2)', () => {
  // Use a fixed reference clock for all deterministic tests: 2026-10-26T12:00:00.000Z
  const mockNow = new Date('2026-10-26T12:00:00.000Z');

  const createLeadHelper = (overrides: Partial<Lead>): Lead => ({
    id: 'test-lead-1',
    workspace_id: 'ws-test',
    name: 'Test Prospect',
    company: 'Test Corp',
    email: 'test@corp.com',
    service: 'Web Development',
    source: 'Website Form',
    status: 'new',
    deal_value: 5000,
    created_at: '2026-10-20T10:00:00Z',
    updated_at: '2026-10-20T10:00:00Z',
    ...overrides,
  });

  describe('categorizeFollowUp', () => {
    it('marks a lead as overdue when its follow-up date is earlier than now', () => {
      const pastLead = {
        status: 'qualified' as const,
        next_follow_up: '2026-10-26T11:59:59.000Z', // 1s before mockNow
      };
      expect(categorizeFollowUp(pastLead, mockNow)).toBe('overdue');
    });

    it('marks a lead as due_soon when follow-up is at exact reference timestamp', () => {
      const exactNowLead = {
        status: 'new' as const,
        next_follow_up: '2026-10-26T12:00:00.000Z',
      };
      expect(categorizeFollowUp(exactNowLead, mockNow)).toBe('due_soon');
    });

    it('marks a lead as due_soon within the 48-hour window', () => {
      const in24HoursLead = {
        status: 'proposal' as const,
        next_follow_up: '2026-10-27T12:00:00.000Z', // 24h later
      };
      expect(categorizeFollowUp(in24HoursLead, mockNow)).toBe('due_soon');
    });

    it('marks a lead as due_soon at the exact 48-hour boundary timestamp', () => {
      const exact48hTime = new Date(mockNow.getTime() + FOLLOW_UP_WINDOW_MS).toISOString();
      const boundaryLead = {
        status: 'new' as const,
        next_follow_up: exact48hTime,
      };
      expect(categorizeFollowUp(boundaryLead, mockNow)).toBe('due_soon');
    });

    it('marks a lead as future when beyond 48 hours by even 1 millisecond', () => {
      const beyond48hTime = new Date(mockNow.getTime() + FOLLOW_UP_WINDOW_MS + 1).toISOString();
      const futureLead = {
        status: 'qualified' as const,
        next_follow_up: beyond48hTime,
      };
      expect(categorizeFollowUp(futureLead, mockNow)).toBe('future');
    });

    it('excludes closed-won leads from active follow-ups even with past date', () => {
      const wonLead = {
        status: 'won' as const,
        next_follow_up: '2026-10-25T10:00:00.000Z',
      };
      expect(categorizeFollowUp(wonLead, mockNow)).toBe('none');
    });

    it('excludes closed-lost leads from active follow-ups even with future date', () => {
      const lostLead = {
        status: 'lost' as const,
        next_follow_up: '2026-10-27T10:00:00.000Z',
      };
      expect(categorizeFollowUp(lostLead, mockNow)).toBe('none');
    });

    it('handles invalid or non-parseable dates gracefully without crashing', () => {
      expect(categorizeFollowUp({ status: 'new', next_follow_up: 'invalid-date' }, mockNow)).toBe('none');
      expect(categorizeFollowUp({ status: 'new', next_follow_up: '' }, mockNow)).toBe('none');
      expect(categorizeFollowUp({ status: 'new', next_follow_up: undefined }, mockNow)).toBe('none');
    });
  });

  describe('computeDashboardMetrics aggregation', () => {
    it('accurately computes mutually exclusive overdue and due-soon counts', () => {
      const leads: Lead[] = [
        // Overdue (1 day past)
        createLeadHelper({ id: '1', status: 'new', next_follow_up: '2026-10-25T12:00:00Z', deal_value: 3000 }),
        // Due Soon (24 hours away)
        createLeadHelper({ id: '2', status: 'qualified', next_follow_up: '2026-10-27T12:00:00Z', deal_value: 5000 }),
        // Future (> 48h away)
        createLeadHelper({ id: '3', status: 'proposal', next_follow_up: '2026-10-30T12:00:00Z', deal_value: 7000 }),
        // Won lead (has follow up date, but must NOT count)
        createLeadHelper({ id: '4', status: 'won', next_follow_up: '2026-10-25T12:00:00Z', deal_value: 10000 }),
        // Lost lead (has follow up date, but must NOT count)
        createLeadHelper({ id: '5', status: 'lost', next_follow_up: '2026-10-27T12:00:00Z', deal_value: 4000 }),
        // Invalid date lead
        createLeadHelper({ id: '6', status: 'new', next_follow_up: 'bad-date', deal_value: 2000 }),
      ];

      const metrics = computeDashboardMetrics(leads, mockNow);

      expect(metrics.totalLeads).toBe(6);
      expect(metrics.newLeads).toBe(2); // id 1 and id 6
      expect(metrics.followUpsOverdue).toBe(1); // id 1
      expect(metrics.followUpsDueSoon).toBe(1); // id 2
      expect(metrics.followUpsDue).toBe(2); // overdue (1) + due_soon (1)
      expect(metrics.opportunitiesWon).toBe(1); // id 4
      expect(metrics.wonRevenue).toBe(10000); // id 4
      // Pipeline value includes all non-lost deals: id 1(3k) + 2(5k) + 3(7k) + 4(10k) + 6(2k) = 27000
      expect(metrics.totalPipelineValue).toBe(27000);
    });

    it('returns zeroes safely for empty leads array', () => {
      const metrics = computeDashboardMetrics([], mockNow);
      expect(metrics).toEqual({
        totalLeads: 0,
        newLeads: 0,
        followUpsDue: 0,
        followUpsOverdue: 0,
        followUpsDueSoon: 0,
        opportunitiesWon: 0,
        totalPipelineValue: 0,
        wonRevenue: 0,
      });
    });
  });
});
