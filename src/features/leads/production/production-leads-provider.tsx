'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import type { Lead, LeadActivity, LeadTask } from '@/types/lead';
import type { LeadFormData } from '@/lib/validation/lead';
import {
  supabaseLeadsService,
  supabaseTasksService,
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
  activeWorkspace: { id: string; name: string; role: string; slug: string } | null;
}

const ProductionLeadsContext = createContext<ProductionLeadsContextType | undefined>(undefined);

export function ProductionLeadsProvider({ children }: { children: React.ReactNode }) {
  const { activeWorkspace } = useWorkspace();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const workspaceId = activeWorkspace?.id;
  const currentWorkspaceIdRef = useRef<string | undefined>(workspaceId);
  const requestIdRef = useRef<number>(0);

  const refreshData = useCallback(async () => {
    // Clear data when there is no valid production workspace
    if (!workspaceId || workspaceId === 'ws-demo-1') {
      setLeads([]);
      setTasks([]);
      setActivities([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const thisRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const [loadedLeads, loadedTasks, loadedActivities] = await Promise.all([
        supabaseLeadsService.getLeads(workspaceId),
        supabaseTasksService.getTasks(workspaceId),
        import('./supabase-leads-service').then((m) =>
          m.supabaseActivitiesService.getActivities(workspaceId)
        ),
      ]);

      // Prevent stale asynchronous requests from an old workspace from overwriting data
      if (thisRequestId !== requestIdRef.current || workspaceId !== currentWorkspaceIdRef.current) {
        return;
      }

      setLeads(loadedLeads);
      setTasks(loadedTasks);
      setActivities(loadedActivities);
    } catch (err) {
      if (thisRequestId !== requestIdRef.current || workspaceId !== currentWorkspaceIdRef.current) {
        return;
      }
      console.error('[ProductionLeadsProvider] Failed to load data:', err);
      // Clear data on failure to guarantee consistent state without stale data
      setLeads([]);
      setTasks([]);
      setActivities([]);
      setError(
        err instanceof Error
          ? err
          : new SupabaseServiceError('Failed to load agency leads and tasks.')
      );
    } finally {
      if (thisRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [workspaceId]);

  useEffect(() => {
    const prevWorkspaceId = currentWorkspaceIdRef.current;
    currentWorkspaceIdRef.current = workspaceId;

    // Clear previous workspace data immediately before loading a different workspace
    if (prevWorkspaceId !== workspaceId) {
      setLeads([]);
      setTasks([]);
      setActivities([]);
      setError(null);
    }

    const timer = setTimeout(() => {
      if (workspaceId && workspaceId !== 'ws-demo-1') {
        void refreshData();
      } else {
        setLeads([]);
        setTasks([]);
        setActivities([]);
        setIsLoading(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [workspaceId, refreshData]);

  const createLead = useCallback(
    async (data: LeadFormData): Promise<Lead> => {
      if (!workspaceId || workspaceId === 'ws-demo-1') {
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
        // Atomic single transaction on Postgres: lead + initial activity + follow-up task
        const createdLead = await supabaseLeadsService.createLeadTransactional(workspaceId, {
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
    [workspaceId, refreshData]
  );

  const updateLead = useCallback(
    async (id: string, data: Partial<LeadFormData>): Promise<void> => {
      if (!workspaceId || workspaceId === 'ws-demo-1') {
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

      const mergedLead: Lead = {
        ...previousLead,
        name: data.name !== undefined ? data.name.trim() : previousLead.name,
        company: data.company !== undefined ? data.company.trim() : previousLead.company,
        email: data.email !== undefined ? data.email.trim() : previousLead.email,
        phone: data.phone !== undefined ? data.phone.trim() || undefined : previousLead.phone,
        service: data.service !== undefined ? data.service : previousLead.service,
        source: data.source !== undefined ? data.source : previousLead.source,
        status: data.status !== undefined ? data.status : previousLead.status,
        deal_value:
          data.deal_value !== undefined ? Number(data.deal_value) || 0 : previousLead.deal_value,
        next_follow_up: normalizedFollowUp,
        notes: data.notes !== undefined ? data.notes.trim() || undefined : previousLead.notes,
        updated_at: new Date().toISOString(),
      };

      try {
        // Atomic single transaction on Postgres: lead update + status activity + task sync
        await supabaseLeadsService.updateLeadTransactional(id, workspaceId, mergedLead);
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
    [workspaceId, leads, refreshData]
  );

  const deleteLead = useCallback(
    async (id: string): Promise<void> => {
      if (!workspaceId || workspaceId === 'ws-demo-1') {
        throw new SupabaseServiceError('Cannot delete production lead without an active real workspace.');
      }

      setError(null);
      try {
        // Atomic deletion preserving workspace audit trail
        await supabaseLeadsService.deleteLeadTransactional(id, workspaceId, true);
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
    [workspaceId, refreshData]
  );

  const toggleTask = useCallback(
    async (id: string): Promise<void> => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      setError(null);
      try {
        const nextCompleted = !task.completed;
        await supabaseTasksService.updateTask(id, {
          completed: nextCompleted,
          completed_at: nextCompleted ? new Date().toISOString() : undefined,
        });
        await refreshData();
      } catch (err) {
        const serviceError =
          err instanceof Error
            ? err
            : new SupabaseServiceError('Failed to update task status in production database.');
        setError(serviceError);
        throw serviceError;
      }
    },
    [tasks, refreshData]
  );

  const [currentDate, setCurrentDate] = useState(() => new Date('2026-10-26T12:00:00Z'));

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentDate(new Date());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const metrics = useMemo(() => {
    return computeDashboardMetrics(leads, currentDate);
  }, [leads, currentDate]);

  const value = useMemo<ProductionLeadsContextType>(
    () => ({
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
      activeWorkspace:
        activeWorkspace && activeWorkspace.id !== 'ws-demo-1' ? activeWorkspace : null,
    }),
    [
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
    ]
  );

  return <ProductionLeadsContext.Provider value={value}>{children}</ProductionLeadsContext.Provider>;
}

export function useProductionLeads() {
  const context = useContext(ProductionLeadsContext);
  if (!context) {
    throw new Error('useProductionLeads must be used within a ProductionLeadsProvider');
  }
  return context;
}
