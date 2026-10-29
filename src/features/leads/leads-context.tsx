'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Lead, LeadActivity, LeadTask } from '@/types/lead';
import type { LeadFormData } from '@/lib/validation/lead';
import {
  INITIAL_MOCK_LEADS,
  INITIAL_MOCK_TASKS,
  INITIAL_MOCK_ACTIVITIES,
} from './mock-data';
import {
  computeDashboardMetrics,
  type DashboardMetrics,
} from '../dashboard/mock-data';

interface LeadsContextType {
  leads: Lead[];
  tasks: LeadTask[];
  activities: LeadActivity[];
  metrics: DashboardMetrics;
  createLead: (data: LeadFormData) => Lead;
  updateLead: (id: string, data: Partial<LeadFormData>) => void;
  deleteLead: (id: string) => void;
  toggleTask: (id: string) => void;
  activeWorkspace: { id: string; name: string; role: string };
}

const LeadsContext = createContext<LeadsContextType | undefined>(undefined);

export const LOCAL_STORAGE_KEY_LEADS = 'leadflow_demo_leads_v1';
export const LOCAL_STORAGE_KEY_TASKS = 'leadflow_demo_tasks_v1';
export const LOCAL_STORAGE_KEY_ACTIVITIES = 'leadflow_demo_activities_v1';

/**
 * Generates a collision-resistant UUID with an optional prefix.
 */
export function generateEntityId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  // Safe fallback for test environments or older runtimes
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Safely parses localStorage data, gracefully falling back if malformed or corrupt.
 */
function safeLoadStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    if (Array.isArray(fallback) && !Array.isArray(parsed)) {
      console.warn(`[LeadFlow Storage] Malformed data in localStorage for "${key}". Resetting to fallback.`);
      return fallback;
    }
    return parsed as T;
  } catch (err) {
    console.warn(`[LeadFlow Storage] Failed to read localStorage key "${key}":`, err);
    return fallback;
  }
}

/**
 * Safely writes to localStorage with observable warnings on failure (e.g. quota exceeded).
 */
function safeSaveStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[LeadFlow Storage] Failed to persist data to key "${key}":`, err);
  }
}

export function LeadsProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(() =>
    safeLoadStorage(LOCAL_STORAGE_KEY_LEADS, INITIAL_MOCK_LEADS)
  );

  const [tasks, setTasks] = useState<LeadTask[]>(() =>
    safeLoadStorage(LOCAL_STORAGE_KEY_TASKS, INITIAL_MOCK_TASKS)
  );

  const [activities, setActivities] = useState<LeadActivity[]>(() =>
    safeLoadStorage(LOCAL_STORAGE_KEY_ACTIVITIES, INITIAL_MOCK_ACTIVITIES)
  );

  useEffect(() => {
    safeSaveStorage(LOCAL_STORAGE_KEY_LEADS, leads);
  }, [leads]);

  useEffect(() => {
    safeSaveStorage(LOCAL_STORAGE_KEY_TASKS, tasks);
  }, [tasks]);

  useEffect(() => {
    safeSaveStorage(LOCAL_STORAGE_KEY_ACTIVITIES, activities);
  }, [activities]);

  const activeWorkspace = {
    id: 'ws-demo-1',
    name: 'Velocity Digital Agency',
    role: 'Agency Admin',
  };

  /**
   * Creates a new lead with collision-resistant ID and synchronized initial follow-up task.
   */
  const createLead = useCallback((data: LeadFormData): Lead => {
    const now = new Date().toISOString();
    const newId = generateEntityId('lead');

    // Only accept follow up date if non-empty and valid
    let validFollowUp: string | undefined = undefined;
    if (data.next_follow_up && data.next_follow_up.trim() !== '') {
      const parsedTime = new Date(data.next_follow_up).getTime();
      if (!Number.isNaN(parsedTime)) {
        validFollowUp = data.next_follow_up;
      }
    }

    const newLead: Lead = {
      id: newId,
      workspace_id: activeWorkspace.id,
      name: data.name.trim(),
      company: data.company.trim(),
      email: data.email.trim(),
      phone: data.phone?.trim() || undefined,
      service: data.service,
      source: data.source,
      status: data.status,
      deal_value: Number(data.deal_value) || 0,
      next_follow_up: validFollowUp,
      notes: data.notes?.trim() || undefined,
      created_at: now,
      updated_at: now,
    };

    setLeads((prev) => [newLead, ...prev]);

    // Record creation activity
    const newActivity: LeadActivity = {
      id: generateEntityId('act'),
      workspace_id: activeWorkspace.id,
      lead_id: newLead.id,
      type: 'note',
      description: `Lead created for ${newLead.company} (${newLead.service})`,
      created_at: now,
    };
    setActivities((prev) => [newActivity, ...prev]);

    // Create follow-up task only if valid date exists
    if (validFollowUp) {
      const newTask: LeadTask = {
        id: generateEntityId('task'),
        workspace_id: activeWorkspace.id,
        lead_id: newLead.id,
        lead_name: `${newLead.name} (${newLead.company})`,
        title: `Follow up with ${newLead.name} on ${newLead.service}`,
        due_date: validFollowUp,
        completed: false,
        created_at: now,
      };
      setTasks((prev) => [newTask, ...prev]);
    }

    return newLead;
  }, [activeWorkspace.id]);

  /**
   * Updates an existing lead, correctly comparing previous and next state to record
   * status activities and synchronize associated follow-up tasks.
   *
   * Business rules:
   * - Transition to 'won' or 'lost': any pending follow-up task is auto-completed with a timestamp.
   * - Rescheduling 'next_follow_up': updates existing pending task or creates a new one.
   * - Removing 'next_follow_up': cancels/removes pending follow-up tasks while preserving completed ones.
   * - Editing unrelated fields (e.g. name, company): updates task lead_name while strictly preserving completion state.
   */
  const updateLead = useCallback((id: string, data: Partial<LeadFormData>) => {
    const now = new Date().toISOString();

    setLeads((prevLeads) => {
      const existingIndex = prevLeads.findIndex((l) => l.id === id);
      if (existingIndex === -1) return prevLeads;

      const previousLead = prevLeads[existingIndex];

      // Clean and normalize follow-up date
      let normalizedFollowUp: string | undefined = previousLead.next_follow_up;
      if (data.next_follow_up !== undefined) {
        if (data.next_follow_up && data.next_follow_up.trim() !== '') {
          const parsedTime = new Date(data.next_follow_up).getTime();
          normalizedFollowUp = !Number.isNaN(parsedTime) ? data.next_follow_up : undefined;
        } else {
          normalizedFollowUp = undefined;
        }
      }

      const updatedLead: Lead = {
        ...previousLead,
        ...data,
        name: data.name !== undefined ? data.name.trim() : previousLead.name,
        company: data.company !== undefined ? data.company.trim() : previousLead.company,
        email: data.email !== undefined ? data.email.trim() : previousLead.email,
        phone: data.phone !== undefined ? (data.phone.trim() || undefined) : previousLead.phone,
        deal_value:
          data.deal_value !== undefined ? (Number(data.deal_value) || 0) : previousLead.deal_value,
        next_follow_up: normalizedFollowUp,
        notes: data.notes !== undefined ? (data.notes.trim() || undefined) : previousLead.notes,
        updated_at: now,
      };

      const statusChanged = Boolean(data.status && data.status !== previousLead.status);
      const followUpChanged = previousLead.next_follow_up !== normalizedFollowUp;

      // 1. Record status change activity exactly once per actual transition
      if (statusChanged && data.status) {
        const statusActivity: LeadActivity = {
          id: generateEntityId('act'),
          workspace_id: activeWorkspace.id,
          lead_id: id,
          type: 'status_change',
          description: `Status changed from ${previousLead.status} to ${data.status}`,
          created_at: now,
        };
        setActivities((prevActs) => [statusActivity, ...prevActs]);
      }

      // 2. Synchronize associated follow-up tasks
      setTasks((prevTasks) => {
        const leadTasks = prevTasks.filter((t) => t.lead_id === id);
        const otherTasks = prevTasks.filter((t) => t.lead_id !== id);

        // Case A: Lead transitioned to closed (won or lost) -> complete pending follow-up tasks
        if (updatedLead.status === 'won' || updatedLead.status === 'lost') {
          const updatedLeadTasks = leadTasks.map((task) => {
            if (task.completed) return task; // preserve already completed
            return {
              ...task,
              completed: true,
              completed_at: now,
            };
          });
          return [...updatedLeadTasks, ...otherTasks];
        }

        // Case B: Lead has an active next follow-up date
        if (normalizedFollowUp) {
          const pendingTaskIndex = leadTasks.findIndex((t) => !t.completed);
          if (pendingTaskIndex !== -1) {
            // Update existing pending task
            const updatedLeadTasks = leadTasks.map((task, idx) => {
              if (idx === pendingTaskIndex) {
                return {
                  ...task,
                  lead_name: `${updatedLead.name} (${updatedLead.company})`,
                  title: `Follow up with ${updatedLead.name} on ${updatedLead.service}`,
                  due_date: normalizedFollowUp!,
                };
              }
              // For other (completed) tasks, only update name/company reference
              return {
                ...task,
                lead_name: `${updatedLead.name} (${updatedLead.company})`,
              };
            });
            return [...updatedLeadTasks, ...otherTasks];
          } else if (followUpChanged) {
            // No pending task existed, but follow up date was added/changed: create a new task
            const newTask: LeadTask = {
              id: generateEntityId('task'),
              workspace_id: activeWorkspace.id,
              lead_id: updatedLead.id,
              lead_name: `${updatedLead.name} (${updatedLead.company})`,
              title: `Follow up with ${updatedLead.name} on ${updatedLead.service}`,
              due_date: normalizedFollowUp,
              completed: false,
              created_at: now,
            };
            return [newTask, ...prevTasks];
          }
        } else if (data.next_follow_up === '' || data.next_follow_up === null) {
          // Case C: Follow-up date explicitly removed -> cancel/remove pending tasks, preserve completed
          const completedLeadTasks = leadTasks.filter((t) => t.completed);
          return [...completedLeadTasks, ...otherTasks];
        }

        // Case D: Unrelated edit (company name, deal value, notes, etc.)
        // Keep completion state strictly intact and sync lead_name
        const updatedLeadTasks = leadTasks.map((task) => ({
          ...task,
          lead_name: `${updatedLead.name} (${updatedLead.company})`,
        }));
        return [...updatedLeadTasks, ...otherTasks];
      });

      const nextLeads = [...prevLeads];
      nextLeads[existingIndex] = updatedLead;
      return nextLeads;
    });
  }, [activeWorkspace.id]);

  /**
   * Deletes a lead and cascades deletion to associated tasks and activities,
   * maintaining referential integrity.
   */
  const deleteLead = useCallback((id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setTasks((prev) => prev.filter((t) => t.lead_id !== id));
    setActivities((prev) => prev.filter((a) => a.lead_id !== id));
  }, []);

  /**
   * Toggles completion status of a task.
   */
  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        const willComplete = !task.completed;
        return {
          ...task,
          completed: willComplete,
          completed_at: willComplete ? new Date().toISOString() : undefined,
        };
      })
    );
  }, []);

  // Stable clock during SSR/prerender to prevent blocking prerender errors, updated on mount
  const [currentDate, setCurrentDate] = useState<Date>(
    () => new Date('2026-10-26T12:00:00.000Z')
  );

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  const metrics = React.useMemo(() => {
    return computeDashboardMetrics(leads, currentDate);
  }, [leads, currentDate]);

  return (
    <LeadsContext.Provider
      value={{
        leads,
        tasks,
        activities,
        metrics,
        createLead,
        updateLead,
        deleteLead,
        toggleTask,
        activeWorkspace,
      }}
    >
      {children}
    </LeadsContext.Provider>
  );
}

export function useLeads() {
  const context = useContext(LeadsContext);
  if (!context) {
    throw new Error('useLeads must be used within a LeadsProvider');
  }
  return context;
}
