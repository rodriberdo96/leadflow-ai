'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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

const LOCAL_STORAGE_KEY_LEADS = 'leadflow_demo_leads_v1';
const LOCAL_STORAGE_KEY_TASKS = 'leadflow_demo_tasks_v1';

export function LeadsProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY_LEADS);
        if (saved) return JSON.parse(saved);
      } catch {
        // fallback to initial
      }
    }
    return INITIAL_MOCK_LEADS;
  });

  const [tasks, setTasks] = useState<LeadTask[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY_TASKS);
        if (saved) return JSON.parse(saved);
      } catch {
        // fallback to initial
      }
    }
    return INITIAL_MOCK_TASKS;
  });

  const [activities, setActivities] = useState<LeadActivity[]>(INITIAL_MOCK_ACTIVITIES);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_LEADS, JSON.stringify(leads));
    } catch {
      // Ignore storage error
    }
  }, [leads]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_TASKS, JSON.stringify(tasks));
    } catch {
      // Ignore storage error
    }
  }, [tasks]);

  const activeWorkspace = {
    id: 'ws-demo-1',
    name: 'Velocity Digital Agency',
    role: 'Agency Admin',
  };

  const createLead = (data: LeadFormData): Lead => {
    const now = new Date().toISOString();
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      workspace_id: activeWorkspace.id,
      name: data.name,
      company: data.company,
      email: data.email,
      phone: data.phone || undefined,
      service: data.service,
      source: data.source,
      status: data.status,
      deal_value: Number(data.deal_value) || 0,
      next_follow_up: data.next_follow_up || undefined,
      notes: data.notes || undefined,
      created_at: now,
      updated_at: now,
    };

    setLeads((prev) => [newLead, ...prev]);

    // Record activity
    const newActivity: LeadActivity = {
      id: `act-${Date.now()}`,
      workspace_id: activeWorkspace.id,
      lead_id: newLead.id,
      type: 'note',
      description: `Lead created for ${newLead.company} (${newLead.service})`,
      created_at: now,
    };
    setActivities((prev) => [newActivity, ...prev]);

    // If next follow-up is set, create a task automatically
    if (newLead.next_follow_up) {
      const newTask: LeadTask = {
        id: `task-${Date.now()}`,
        workspace_id: activeWorkspace.id,
        lead_id: newLead.id,
        lead_name: `${newLead.name} (${newLead.company})`,
        title: `Follow up with ${newLead.name} on ${newLead.service}`,
        due_date: newLead.next_follow_up,
        completed: false,
        created_at: now,
      };
      setTasks((prev) => [newTask, ...prev]);
    }

    return newLead;
  };

  const updateLead = (id: string, data: Partial<LeadFormData>) => {
    const now = new Date().toISOString();
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id !== id) return lead;
        return {
          ...lead,
          ...data,
          deal_value: data.deal_value !== undefined ? Number(data.deal_value) : lead.deal_value,
          updated_at: now,
        };
      })
    );

    const updatedLead = leads.find((l) => l.id === id);
    if (updatedLead && data.status && data.status !== updatedLead.status) {
      const statusChangeActivity: LeadActivity = {
        id: `act-${Date.now()}`,
        workspace_id: activeWorkspace.id,
        lead_id: id,
        type: 'status_change',
        description: `Status changed from ${updatedLead.status} to ${data.status}`,
        created_at: now,
      };
      setActivities((prev) => [statusChangeActivity, ...prev]);
    }
  };

  const deleteLead = (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setTasks((prev) => prev.filter((t) => t.lead_id !== id));
  };

  const toggleTask = (id: string) => {
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
  };

  const metrics = computeDashboardMetrics(leads);

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
