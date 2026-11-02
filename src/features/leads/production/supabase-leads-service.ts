import type { Lead, LeadActivity, LeadTask } from '@/types/lead';
import type { Database } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export class SupabaseServiceError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = 'SupabaseServiceError';
  }
}

function getClientOrThrow(): SupabaseClient {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new SupabaseServiceError('Supabase client is not configured or unavailable.');
  }
  return supabase as unknown as SupabaseClient;
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

    return (data as unknown as Lead[]) || [];
  },

  async createLead(
    workspaceId: string,
    leadData: Omit<Lead, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>
  ): Promise<Lead> {
    const supabase = getClientOrThrow();
    const insertPayload: Database['public']['Tables']['leads']['Insert'] = {
      workspace_id: workspaceId,
      name: leadData.name,
      company: leadData.company,
      email: leadData.email,
      phone: leadData.phone || null,
      service: leadData.service,
      source: leadData.source,
      status: leadData.status,
      deal_value: leadData.deal_value,
      next_follow_up: leadData.next_follow_up || null,
      notes: leadData.notes || null,
      assigned_to: leadData.assigned_to || null,
    };

    const { data, error } = await supabase
      .from('leads')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      throw new SupabaseServiceError(`Failed to create lead: ${error.message}`, error);
    }

    return data as unknown as Lead;
  },

  async createLeadTransactional(
    workspaceId: string,
    leadData: Omit<Lead, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>
  ): Promise<Lead> {
    const supabase = getClientOrThrow();
    const { data, error } = await supabase.rpc('create_lead_transactional', {
      p_workspace_id: workspaceId,
      p_name: leadData.name,
      p_company: leadData.company,
      p_email: leadData.email,
      p_phone: leadData.phone || null,
      p_service: leadData.service,
      p_source: leadData.source,
      p_status: leadData.status,
      p_deal_value: leadData.deal_value,
      p_next_follow_up: leadData.next_follow_up || null,
      p_notes: leadData.notes || null,
    });

    if (error) {
      // If RPC is missing or fails, fall back cleanly to granular createLead
      return await this.createLead(workspaceId, leadData);
    }

    return data as unknown as Lead;
  },

  async updateLead(id: string, updates: Partial<Omit<Lead, 'id' | 'workspace_id'>>): Promise<Lead> {
    const supabase = getClientOrThrow();
    const updatePayload: Database['public']['Tables']['leads']['Update'] = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('leads')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new SupabaseServiceError(`Failed to update lead: ${error.message}`, error);
    }

    return data as unknown as Lead;
  },

  async updateLeadTransactional(
    id: string,
    workspaceId: string,
    updates: Lead
  ): Promise<Lead> {
    const supabase = getClientOrThrow();
    const { data, error } = await supabase.rpc('update_lead_transactional', {
      p_lead_id: id,
      p_workspace_id: workspaceId,
      p_name: updates.name,
      p_company: updates.company,
      p_email: updates.email,
      p_phone: updates.phone || null,
      p_service: updates.service,
      p_source: updates.source,
      p_status: updates.status,
      p_deal_value: updates.deal_value,
      p_next_follow_up: updates.next_follow_up || null,
      p_notes: updates.notes || null,
    });

    if (error) {
      // Fallback to standard update
      return await this.updateLead(id, updates);
    }

    return data as unknown as Lead;
  },

  async deleteLead(id: string): Promise<void> {
    const supabase = getClientOrThrow();
    const { error } = await supabase.from('leads').delete().eq('id', id);

    if (error) {
      throw new SupabaseServiceError(`Failed to delete lead: ${error.message}`, error);
    }
  },

  async deleteLeadTransactional(
    id: string,
    workspaceId: string,
    preserveActivities = true
  ): Promise<void> {
    const supabase = getClientOrThrow();
    const { error } = await supabase.rpc('delete_lead_transactional', {
      p_lead_id: id,
      p_workspace_id: workspaceId,
      p_preserve_activities: preserveActivities,
    });

    if (error) {
      // Fallback to standard deleteLead
      await this.deleteLead(id);
    }
  },
};

// -----------------------------------------------------------------------------
// TASKS SERVICE
// -----------------------------------------------------------------------------
interface TaskJoinResult {
  id: string;
  workspace_id: string;
  lead_id: string | null;
  assigned_to: string | null;
  title: string;
  due_date: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  leads?: {
    name: string;
    company: string;
  } | null;
}

export const supabaseTasksService = {
  async getTasks(workspaceId: string): Promise<LeadTask[]> {
    const supabase = getClientOrThrow();
    const { data, error } = await supabase
      .from('tasks')
      .select('*, leads ( name, company )')
      .eq('workspace_id', workspaceId)
      .order('due_date', { ascending: true });

    if (error) {
      throw new SupabaseServiceError(`Failed to fetch tasks: ${error.message}`, error);
    }

    const rows = (data as unknown as TaskJoinResult[]) || [];
    return rows.map((t) => ({
      id: t.id,
      workspace_id: t.workspace_id,
      lead_id: t.lead_id || undefined,
      lead_name: t.leads ? `${t.leads.name} (${t.leads.company})` : undefined,
      assigned_to: t.assigned_to || undefined,
      title: t.title,
      due_date: t.due_date,
      completed: t.completed,
      completed_at: t.completed_at || undefined,
      created_at: t.created_at,
    }));
  },

  async createTask(
    workspaceId: string,
    taskData: Omit<LeadTask, 'id' | 'workspace_id' | 'created_at'>
  ): Promise<LeadTask> {
    const supabase = getClientOrThrow();
    // Exclude lead_name from insertion payload as it's a derived/joined property
    const insertPayload: Database['public']['Tables']['tasks']['Insert'] = {
      workspace_id: workspaceId,
      lead_id: taskData.lead_id || null,
      assigned_to: taskData.assigned_to || null,
      title: taskData.title,
      due_date: taskData.due_date,
      completed: taskData.completed ?? false,
      completed_at: taskData.completed_at || null,
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      throw new SupabaseServiceError(`Failed to create task: ${error.message}`, error);
    }

    const created = data as unknown as Database['public']['Tables']['tasks']['Row'];
    return {
      id: created.id,
      workspace_id: created.workspace_id,
      lead_id: created.lead_id || undefined,
      lead_name: taskData.lead_name,
      assigned_to: created.assigned_to || undefined,
      title: created.title,
      due_date: created.due_date,
      completed: created.completed,
      completed_at: created.completed_at || undefined,
      created_at: created.created_at,
    };
  },

  async updateTask(
    id: string,
    updates: Partial<Omit<LeadTask, 'id' | 'workspace_id'>>
  ): Promise<LeadTask> {
    const supabase = getClientOrThrow();
    const updatePayload: Database['public']['Tables']['tasks']['Update'] = {
      lead_id: updates.lead_id !== undefined ? updates.lead_id || null : undefined,
      assigned_to: updates.assigned_to !== undefined ? updates.assigned_to || null : undefined,
      title: updates.title,
      due_date: updates.due_date,
      completed: updates.completed,
      completed_at: updates.completed_at !== undefined ? updates.completed_at || null : undefined,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new SupabaseServiceError(`Failed to update task: ${error.message}`, error);
    }

    const updated = data as unknown as Database['public']['Tables']['tasks']['Row'];
    return {
      id: updated.id,
      workspace_id: updated.workspace_id,
      lead_id: updated.lead_id || undefined,
      lead_name: updates.lead_name,
      assigned_to: updated.assigned_to || undefined,
      title: updated.title,
      due_date: updated.due_date,
      completed: updated.completed,
      completed_at: updated.completed_at || undefined,
      created_at: updated.created_at,
    };
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

    const rows = (data as unknown as Database['public']['Tables']['activities']['Row'][]) || [];
    return rows.map((a) => ({
      id: a.id,
      workspace_id: a.workspace_id,
      lead_id: a.lead_id,
      user_id: a.user_id || undefined,
      type: a.type,
      description: a.description,
      metadata: (a.metadata as Record<string, unknown>) || undefined,
      created_at: a.created_at,
    }));
  },

  async createActivity(
    workspaceId: string,
    activityData: Omit<LeadActivity, 'id' | 'workspace_id' | 'created_at'>
  ): Promise<LeadActivity> {
    const supabase = getClientOrThrow();
    const insertPayload: Database['public']['Tables']['activities']['Insert'] = {
      workspace_id: workspaceId,
      lead_id: activityData.lead_id,
      user_id: activityData.user_id || null,
      type: activityData.type,
      description: activityData.description,
      metadata: (activityData.metadata as Database['public']['Tables']['activities']['Insert']['metadata']) || {},
    };

    const { data, error } = await supabase
      .from('activities')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      throw new SupabaseServiceError(`Failed to create activity: ${error.message}`, error);
    }

    const created = data as unknown as Database['public']['Tables']['activities']['Row'];
    return {
      id: created.id,
      workspace_id: created.workspace_id,
      lead_id: created.lead_id,
      user_id: created.user_id || undefined,
      type: created.type,
      description: created.description,
      metadata: (created.metadata as Record<string, unknown>) || undefined,
      created_at: created.created_at,
    };
  },
};
