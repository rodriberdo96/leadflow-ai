'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Lead, LeadActivity, LeadTask } from '@/types/lead';
import type { LeadFormData } from '@/lib/validation/lead';
import {
  INITIAL_MOCK_LEADS,
  INITIAL_MOCK_TASKS,
  INITIAL_MOCK_ACTIVITIES,
} from '../mock-data';
import {
  computeDashboardMetrics,
  type DashboardMetrics,
} from '../../dashboard/mock-data';
export function generateEntityId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export interface DemoLeadsContextType {
  leads: Lead[];
  tasks: LeadTask[];
  activities: LeadActivity[];
  metrics: DashboardMetrics;
  isLoading: boolean;
  error: Error | null;
  createLead: (data: LeadFormData) => Promise<Lead>;
  updateLead: (id: string, data: Partial<LeadFormData>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  resetDemoData: () => void;
  activeWorkspace: { id: string; name: string; role: string; slug: string };
}

const LOCAL_STORAGE_KEY_LEADS = 'leadflow_demo_leads_v1';
const LOCAL_STORAGE_KEY_TASKS = 'leadflow_demo_tasks_v1';
const LOCAL_STORAGE_KEY_ACTIVITIES = 'leadflow_demo_activities_v1';

function safeLoadStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

function safeSaveStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[Demo Storage] Failed to persist data to key "${key}":`, err);
  }
}

const DemoLeadsContext = createContext<DemoLeadsContextType | undefined>(undefined);

export function DemoLeadsProvider({ children }: { children: React.ReactNode }) {
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

  const activeWorkspace = useMemo(
    () => ({
      id: 'ws-demo-1',
      name: 'Velocity Digital Agency',
      slug: 'velocity-digital',
      role: 'owner',
    }),
    []
  );

  const createLead = useCallback(
    async (data: LeadFormData): Promise<Lead> => {
      const now = new Date().toISOString();
      const newId = generateEntityId('lead');

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

      const newActivity: LeadActivity = {
        id: generateEntityId('act'),
        workspace_id: activeWorkspace.id,
        lead_id: newLead.id,
        type: 'note',
        description: `Lead created for ${newLead.company} (${newLead.service})`,
        created_at: now,
      };
      setActivities((prev) => [newActivity, ...prev]);

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
    },
    [activeWorkspace.id]
  );

  const updateLead = useCallback(
    async (id: string, data: Partial<LeadFormData>): Promise<void> => {
      const now = new Date().toISOString();

      setLeads((prevLeads) => {
        const existingIndex = prevLeads.findIndex((l) => l.id === id);
        if (existingIndex === -1) return prevLeads;

        const previousLead = prevLeads[existingIndex];

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
          phone: data.phone !== undefined ? data.phone.trim() || undefined : previousLead.phone,
          deal_value:
            data.deal_value !== undefined ? Number(data.deal_value) || 0 : previousLead.deal_value,
          next_follow_up: normalizedFollowUp,
          notes: data.notes !== undefined ? data.notes.trim() || undefined : previousLead.notes,
          updated_at: now,
        };

        const statusChanged = Boolean(data.status && data.status !== previousLead.status);
        const followUpChanged = previousLead.next_follow_up !== normalizedFollowUp;

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

        setTasks((prevTasks) => {
          const leadTasks = prevTasks.filter((t) => t.lead_id === id);
          const otherTasks = prevTasks.filter((t) => t.lead_id !== id);

          if (updatedLead.status === 'won' || updatedLead.status === 'lost') {
            const updatedLeadTasks = leadTasks.map((task) => {
              if (task.completed) return task;
              return {
                ...task,
                completed: true,
                completed_at: now,
              };
            });
            return [...updatedLeadTasks, ...otherTasks];
          }

          if (normalizedFollowUp) {
            const pendingTaskIndex = leadTasks.findIndex((t) => !t.completed);
            if (pendingTaskIndex !== -1) {
              const updatedLeadTasks = leadTasks.map((task, idx) => {
                if (idx === pendingTaskIndex) {
                  return {
                    ...task,
                    lead_name: `${updatedLead.name} (${updatedLead.company})`,
                    title: `Follow up with ${updatedLead.name} on ${updatedLead.service}`,
                    due_date: normalizedFollowUp!,
                  };
                }
                return {
                  ...task,
                  lead_name: `${updatedLead.name} (${updatedLead.company})`,
                };
              });
              return [...updatedLeadTasks, ...otherTasks];
            } else if (followUpChanged) {
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
            const completedLeadTasks = leadTasks.filter((t) => t.completed);
            return [...completedLeadTasks, ...otherTasks];
          }

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
    },
    [activeWorkspace.id]
  );

  const deleteLead = useCallback(async (id: string): Promise<void> => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setTasks((prev) => prev.filter((t) => t.lead_id !== id));
    setActivities((prev) => prev.filter((a) => a.lead_id !== id));
  }, []);

  const toggleTask = useCallback(async (id: string): Promise<void> => {
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

  const resetDemoData = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEY_LEADS);
    localStorage.removeItem(LOCAL_STORAGE_KEY_TASKS);
    localStorage.removeItem(LOCAL_STORAGE_KEY_ACTIVITIES);
    setLeads(INITIAL_MOCK_LEADS);
    setTasks(INITIAL_MOCK_TASKS);
    setActivities(INITIAL_MOCK_ACTIVITIES);
  }, []);

  // Use current date for real calculations, with safe fallback for SSR
  const [currentDate, setCurrentDate] = useState<Date>(
    () => new Date('2026-10-26T12:00:00.000Z')
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentDate(new Date());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const metrics = useMemo(() => {
    return computeDashboardMetrics(leads, currentDate);
  }, [leads, currentDate]);

  return (
    <DemoLeadsContext.Provider
      value={{
        leads,
        tasks,
        activities,
        metrics,
        isLoading: false,
        error: null,
        createLead,
        updateLead,
        deleteLead,
        toggleTask,
        resetDemoData,
        activeWorkspace,
      }}
    >
      {children}
    </DemoLeadsContext.Provider>
  );
}

export function useDemoLeads() {
  const context = useContext(DemoLeadsContext);
  if (!context) {
    throw new Error('useDemoLeads must be used within a DemoLeadsProvider');
  }
  return context;
}
