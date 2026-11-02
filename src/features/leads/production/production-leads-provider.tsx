'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Lead, LeadActivity, LeadTask } from '@/types/lead';
import type { LeadFormData } from '@/lib/validation/lead';
import {
  supabaseLeadsService,
  supabaseTasksService,
  supabaseActivitiesService,
  SupabaseServiceError,
} from './supabase-leads-service';
import { computeDashboardMetrics, type DashboardMetrics } from '../../dashboard/mock-data';
import { useWorkspace } from '@/context/workspace-context';

export interface ProductionLeadsContextType {
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
  refreshData: () => Promise<void>;
  activeWorkspace: { id: string; name: string; role: string; slug: string };
}

const ProductionLeadsContext = createContext<ProductionLeadsContextType | undefined>(undefined);

export function ProductionLeadsProvider({ children }: { children: React.ReactNode }) {
  const { activeWorkspace } = useWorkspace();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshData = useCallback(async () => {
    if (!activeWorkspace?.id || activeWorkspace.id === 'ws-demo-1') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [loadedLeads, loadedTasks, loadedActivities] = await Promise.all([
        supabaseLeadsService.getLeads(activeWorkspace.id),
        supabaseTasksService.getTasks(activeWorkspace.id),
        supabaseActivitiesService.getActivities(activeWorkspace.id),
      ]);

      setLeads(loadedLeads);
      setTasks(loadedTasks);
      setActivities(loadedActivities);
    } catch (err) {
      console.error('[ProductionLeadsProvider] Failed to load data:', err);
      setError(
        err instanceof Error
          ? err
          : new SupabaseServiceError('Failed to load agency leads and tasks.')
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const createLead = useCallback(
    async (data: LeadFormData): Promise<Lead> => {
      if (!activeWorkspace?.id || activeWorkspace.id === 'ws-demo-1') {
        throw new SupabaseServiceError('Cannot create production lead without an active real workspace.');
      }

      setError(null);

      let validFollowUp: string | undefined = undefined;
      if (data.next_follow_up && data.next_follow_up.trim() !== '') {
        const parsedTime = new Date(data.next_follow_up).getTime();
        if (!Number.isNaN(parsedTime)) {
          validFollowUp = data.next_follow_up;
        }
      }

      try {
        const createdLead = await supabaseLeadsService.createLead(activeWorkspace.id, {
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
        });

        // Record activity in Supabase
        await supabaseActivitiesService.createActivity(activeWorkspace.id, {
          lead_id: createdLead.id,
          type: 'note',
          description: `Lead created for ${createdLead.company} (${createdLead.service})`,
        });

        // Automatically create follow-up task in Supabase if scheduled
        if (validFollowUp) {
          await supabaseTasksService.createTask(activeWorkspace.id, {
            lead_id: createdLead.id,
            lead_name: `${createdLead.name} (${createdLead.company})`,
            title: `Follow up with ${createdLead.name} on ${createdLead.service}`,
            due_date: validFollowUp,
            completed: false,
          });
        }

        // Refresh all synchronized data from server
        await refreshData();
        return createdLead;
      } catch (err) {
        const serviceError =
          err instanceof Error
            ? err
            : new SupabaseServiceError('Failed to create lead in production database.');
        setError(serviceError);
        throw serviceError;
      }
    },
    [activeWorkspace?.id, refreshData]
  );

  const updateLead = useCallback(
    async (id: string, data: Partial<LeadFormData>): Promise<void> => {
      if (!activeWorkspace?.id || activeWorkspace.id === 'ws-demo-1') {
        throw new SupabaseServiceError('Cannot update production lead without an active real workspace.');
      }

      const previousLead = leads.find((l) => l.id === id);
      if (!previousLead) return;

      setError(null);

      let normalizedFollowUp: string | undefined = previousLead.next_follow_up;
      if (data.next_follow_up !== undefined) {
        if (data.next_follow_up && data.next_follow_up.trim() !== '') {
          const parsedTime = new Date(data.next_follow_up).getTime();
          normalizedFollowUp = !Number.isNaN(parsedTime) ? data.next_follow_up : undefined;
        } else {
          normalizedFollowUp = undefined;
        }
      }

      const statusChanged = Boolean(data.status && data.status !== previousLead.status);
      const followUpChanged = previousLead.next_follow_up !== normalizedFollowUp;

      try {
        const updatedLead = await supabaseLeadsService.updateLead(id, {
          ...data,
          name: data.name !== undefined ? data.name.trim() : previousLead.name,
          company: data.company !== undefined ? data.company.trim() : previousLead.company,
          email: data.email !== undefined ? data.email.trim() : previousLead.email,
          phone: data.phone !== undefined ? data.phone.trim() || undefined : previousLead.phone,
          deal_value:
            data.deal_value !== undefined ? Number(data.deal_value) || 0 : previousLead.deal_value,
          next_follow_up: normalizedFollowUp,
          notes: data.notes !== undefined ? data.notes.trim() || undefined : previousLead.notes,
        });

        // 1. Record status change activity if applicable
        if (statusChanged && data.status) {
          await supabaseActivitiesService.createActivity(activeWorkspace.id, {
            lead_id: id,
            type: 'status_change',
            description: `Status changed from ${previousLead.status} to ${data.status}`,
          });
        }

        // 2. Synchronize related tasks
        const leadTasks = tasks.filter((t) => t.lead_id === id);

        if (updatedLead.status === 'won' || updatedLead.status === 'lost') {
          // Auto-complete pending tasks
          for (const task of leadTasks) {
            if (!task.completed) {
              await supabaseTasksService.updateTask(task.id, {
                completed: true,
                completed_at: new Date().toISOString(),
              });
            }
          }
        } else if (normalizedFollowUp) {
          const pendingTask = leadTasks.find((t) => !t.completed);
          if (pendingTask) {
            await supabaseTasksService.updateTask(pendingTask.id, {
              lead_name: `${updatedLead.name} (${updatedLead.company})`,
              title: `Follow up with ${updatedLead.name} on ${updatedLead.service}`,
              due_date: normalizedFollowUp,
            });
          } else if (followUpChanged) {
            await supabaseTasksService.createTask(activeWorkspace.id, {
              lead_id: updatedLead.id,
              lead_name: `${updatedLead.name} (${updatedLead.company})`,
              title: `Follow up with ${updatedLead.name} on ${updatedLead.service}`,
              due_date: normalizedFollowUp,
              completed: false,
            });
          }
        } else if (data.next_follow_up === '' || data.next_follow_up === null) {
          // Remove pending tasks if follow-up date was cleared
          for (const task of leadTasks) {
            if (!task.completed) {
              await supabaseTasksService.deleteTask(task.id);
            }
          }
        }

        await refreshData();
      } catch (err) {
        const serviceError =
          err instanceof Error
            ? err
            : new SupabaseServiceError('Failed to update lead in production database.');
        setError(serviceError);
        throw serviceError;
      }
    },
    [activeWorkspace?.id, leads, tasks, refreshData]
  );

  const deleteLead = useCallback(
    async (id: string): Promise<void> => {
      setError(null);
      try {
        await supabaseLeadsService.deleteLead(id);
        await refreshData();
      } catch (err) {
        const serviceError =
          err instanceof Error
            ? err
            : new SupabaseServiceError('Failed to delete lead in production database.');
        setError(serviceError);
        throw serviceError;
      }
    },
    [refreshData]
  );

  const toggleTask = useCallback(
    async (id: string): Promise<void> => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      setError(null);
      const willComplete = !task.completed;

      try {
        await supabaseTasksService.updateTask(id, {
          completed: willComplete,
          completed_at: willComplete ? new Date().toISOString() : undefined,
        });
        await refreshData();
      } catch (err) {
        const serviceError =
          err instanceof Error
            ? err
            : new SupabaseServiceError('Failed to toggle task in production database.');
        setError(serviceError);
        throw serviceError;
      }
    },
    [tasks, refreshData]
  );

  const [currentDate, setCurrentDate] = useState<Date>(
    () => new Date('2026-10-26T12:00:00.000Z')
  );

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  const metrics = useMemo(() => {
    return computeDashboardMetrics(leads, currentDate);
  }, [leads, currentDate]);

  return (
    <ProductionLeadsContext.Provider
      value={{
        leads,
        tasks,
        activities,
        metrics,
        isLoading,
        error,
        createLead,
        updateLead,
        deleteLead,
        toggleTask,
        refreshData,
        activeWorkspace,
      }}
    >
      {children}
    </ProductionLeadsContext.Provider>
  );
}

export function useProductionLeads() {
  const context = useContext(ProductionLeadsContext);
  if (!context) {
    throw new Error('useProductionLeads must be used within a ProductionLeadsProvider');
  }
  return context;
}

