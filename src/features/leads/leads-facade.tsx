'use client';

import React from 'react';
import type { Lead, LeadActivity, LeadTask } from '@/types/lead';
import type { LeadFormData } from '@/lib/validation/lead';
import type { DashboardMetrics } from '../dashboard/mock-data';
import { useAppMode } from '@/context/app-mode-context';
import { DemoLeadsProvider, useDemoLeads } from './demo/demo-leads-provider';
import {
  ProductionLeadsProvider,
  useProductionLeads,
} from './production/production-leads-provider';

export interface LeadsFacadeContextType {
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
  activeWorkspace: { id: string; name: string; role: string; slug?: string } | null;
  isDemo: boolean;
}

const LeadsContext = React.createContext<LeadsFacadeContextType | undefined>(undefined);

function DemoConsumer({ children }: { children: React.ReactNode }) {
  const demo = useDemoLeads();
  const value: LeadsFacadeContextType = {
    ...demo,
    isDemo: true,
  };
  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}

function ProductionConsumer({ children }: { children: React.ReactNode }) {
  const prod = useProductionLeads();
  const value: LeadsFacadeContextType = {
    ...prod,
    isDemo: false,
  };
  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
}

/**
 * Universal LeadsProvider: transparently isolates Demo Mode (localStorage) from Production Mode (Supabase)
 * based on AppModeContext.
 */
export function LeadsProvider({ children }: { children: React.ReactNode }) {
  const { isProduction } = useAppMode();

  if (isProduction) {
    return (
      <ProductionLeadsProvider>
        <ProductionConsumer>{children}</ProductionConsumer>
      </ProductionLeadsProvider>
    );
  }

  return (
    <DemoLeadsProvider>
      <DemoConsumer>{children}</DemoConsumer>
    </DemoLeadsProvider>
  );
}

export function useLeads(): LeadsFacadeContextType {
  const context = React.useContext(LeadsContext);
  if (!context) {
    throw new Error('useLeads must be used within a LeadsProvider');
  }
  return context;
}

