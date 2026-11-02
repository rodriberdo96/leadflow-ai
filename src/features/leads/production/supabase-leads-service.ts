import type { Lead, LeadActivity, LeadTask } from '@/types/lead';
import type { Database } from '@/types/database';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export class SupabaseServiceError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = 'SupabaseServiceError';
  }
}

function getClientOrThrow() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new SupabaseServiceError('Supabase client is not configured or unavailable.');
  }
  return supabase;
}

// -----------------------------------------------------------------------------
// LEADS SERVICE
// -----------------------------------------------------------------------------
export const supabaseLeadsService = {
  async getLeads(workspaceId: string): Promise<Lead[]> {
    const supabase = getClientOrThrow();
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new SupabaseServiceError(`Failed to fetch leads: ${error.message}`, error);
    }

    return (data as Lead[]) || [];
  },

  async createLead(
    workspaceId: string,
    leadData: Omit<Lead, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>
  ): Promise<Lead> {
    const supabase = getClientOrThrow();
    const insertPayload: Database['public']['Tables']['leads']['Insert'] = {
      workspace_id: workspaceId,
      ...leadData,
    };
    const { data, error } = await supabase
      .from('leads')
      .insert(insertPayload as any)
      .select()
      .single();

    if (error) {
      throw new SupabaseServiceError(`Failed to create lead: ${error.message}`, error);
    }

    return data as Lead;
  },

  async updateLead(id: string, updates: Partial<Omit<Lead, 'id' | 'workspace_id'>>): Promise<Lead> {
    const supabase = getClientOrThrow();
    const updatePayload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await (supabase.from('leads') as any)
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new SupabaseServiceError(`Failed to update lead: ${error.message}`, error);
    }

    return data as Lead;
  },

  async deleteLead(id: string): Promise<void> {
    const supabase = getClientOrThrow();
    const { error } = await supabase.from('leads').delete().eq('id', id);

    if (error) {
      throw new SupabaseServiceError(`Failed to delete lead: ${error.message}`, error);
    }
  },
};

// -----------------------------------------------------------------------------
// TASKS SERVICE
// -----------------------------------------------------------------------------
export const supabaseTasksService = {
  async getTasks(workspaceId: string): Promise<LeadTask[]> {
    const supabase = getClientOrThrow();
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('due_date', { ascending: true });

    if (error) {
      throw new SupabaseServiceError(`Failed to fetch tasks: ${error.message}`, error);
    }

    return (data as LeadTask[]) || [];
  },

  async createTask(
    workspaceId: string,
    taskData: Omit<LeadTask, 'id' | 'workspace_id' | 'created_at'>
  ): Promise<LeadTask> {
    const supabase = getClientOrThrow();
    const insertPayload: Database['public']['Tables']['tasks']['Insert'] = {
      workspace_id: workspaceId,
      ...taskData,
    };
    const { data, error } = await supabase
      .from('tasks')
      .insert(insertPayload as any)
      .select()
      .single();

    if (error) {
      throw new SupabaseServiceError(`Failed to create task: ${error.message}`, error);
    }

    return data as LeadTask;
  },

  async updateTask(id: string, updates: Partial<Omit<LeadTask, 'id' | 'workspace_id'>>): Promise<LeadTask> {
    const supabase = getClientOrThrow();
    const updatePayload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await (supabase.from('tasks') as any)
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new SupabaseServiceError(`Failed to update task: ${error.message}`, error);
    }

    return data as LeadTask;
  },

  async deleteTask(id: string): Promise<void> {
    const supabase = getClientOrThrow();
    const { error } = await supabase.from('tasks').delete().eq('id', id);

    if (error) {
      throw new SupabaseServiceError(`Failed to delete task: ${error.message}`, error);
    }
  },
};

// -----------------------------------------------------------------------------
// ACTIVITIES SERVICE
// -----------------------------------------------------------------------------
export const supabaseActivitiesService = {
  async getActivities(workspaceId: string): Promise<LeadActivity[]> {
    const supabase = getClientOrThrow();
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new SupabaseServiceError(`Failed to fetch activities: ${error.message}`, error);
    }

    return (data as LeadActivity[]) || [];
  },

  async createActivity(
    workspaceId: string,
    activityData: Omit<LeadActivity, 'id' | 'workspace_id' | 'created_at'>
  ): Promise<LeadActivity> {
    const supabase = getClientOrThrow();
    const insertPayload = {
      workspace_id: workspaceId,
      ...activityData,
    };
    const { data, error } = await (supabase.from('activities') as any)
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      throw new SupabaseServiceError(`Failed to create activity: ${error.message}`, error);
    }

    return data as LeadActivity;
  },
};
