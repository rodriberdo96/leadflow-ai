import type { Lead } from './lead';
import type { Workspace, WorkspaceMember, Subscription } from './workspace';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: Workspace;
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: WorkspaceMember;
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member';
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'member';
          created_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: Subscription & { created_at: string; updated_at: string };
        Insert: {
          id?: string;
          workspace_id: string;
          plan?: 'free' | 'starter' | 'growth' | 'agency';
          status?: 'active' | 'trialing' | 'past_due' | 'canceled';
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          plan?: 'free' | 'starter' | 'growth' | 'agency';
          status?: 'active' | 'trialing' | 'past_due' | 'canceled';
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      leads: {
        Row: Lead;
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          company: string;
          email: string;
          phone?: string | null;
          service: string;
          source: string;
          status?: 'new' | 'qualified' | 'proposal' | 'won' | 'lost';
          deal_value?: number;
          next_follow_up?: string | null;
          notes?: string | null;
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          company?: string;
          email?: string;
          phone?: string | null;
          service?: string;
          source?: string;
          status?: 'new' | 'qualified' | 'proposal' | 'won' | 'lost';
          deal_value?: number;
          next_follow_up?: string | null;
          notes?: string | null;
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          workspace_id: string;
          lead_id: string | null;
          user_id: string | null;
          type:
            | 'note'
            | 'status_change'
            | 'email'
            | 'call'
            | 'meeting'
            | 'ai_summary'
            | 'ai_classification';
          description: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          lead_id?: string | null;
          user_id?: string | null;
          type:
            | 'note'
            | 'status_change'
            | 'email'
            | 'call'
            | 'meeting'
            | 'ai_summary'
            | 'ai_classification';
          description: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          lead_id?: string | null;
          user_id?: string | null;
          type?:
            | 'note'
            | 'status_change'
            | 'email'
            | 'call'
            | 'meeting'
            | 'ai_summary'
            | 'ai_classification';
          description?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
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
          task_type: 'system_follow_up' | 'manual';
        };
        Insert: {
          id?: string;
          workspace_id: string;
          lead_id?: string | null;
          assigned_to?: string | null;
          title: string;
          due_date: string;
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          task_type?: 'system_follow_up' | 'manual';
        };
        Update: {
          id?: string;
          workspace_id?: string;
          lead_id?: string | null;
          assigned_to?: string | null;
          title?: string;
          due_date?: string;
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          task_type?: 'system_follow_up' | 'manual';
        };
        Relationships: [];
      };
      ai_usage: {
        Row: {
          id: string;
          workspace_id: string;
          user_id?: string | null;
          feature: 'classification' | 'summary' | 'reply_draft';
          tokens_used: number;
          model: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id?: string | null;
          feature: 'classification' | 'summary' | 'reply_draft';
          tokens_used: number;
          model: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string | null;
          feature?: 'classification' | 'summary' | 'reply_draft';
          tokens_used?: number;
          model?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_workspace: {
        Args: {
          name: string;
          slug: string;
        };
        Returns: string;
      };
      is_workspace_member: {
        Args: {
          ws_id: string;
        };
        Returns: boolean;
      };
      is_workspace_admin: {
        Args: {
          ws_id: string;
        };
        Returns: boolean;
      };
      is_workspace_owner: {
        Args: {
          ws_id: string;
        };
        Returns: boolean;
      };
      get_user_workspace_role: {
        Args: {
          ws_id: string;
          uid?: string;
        };
        Returns: string | null;
      };
      count_workspace_owners: {
        Args: {
          ws_id: string;
        };
        Returns: number;
      };
      create_lead_transactional: {
        Args: {
          p_workspace_id: string;
          p_name: string;
          p_company: string;
          p_email: string;
          p_phone?: string | null;
          p_service: string;
          p_source: string;
          p_status: string;
          p_deal_value: number;
          p_next_follow_up?: string | null;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      update_lead_transactional: {
        Args: {
          p_lead_id: string;
          p_workspace_id: string;
          p_name: string;
          p_company: string;
          p_email: string;
          p_phone?: string | null;
          p_service: string;
          p_source: string;
          p_status: string;
          p_deal_value: number;
          p_next_follow_up?: string | null;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      delete_lead_transactional: {
        Args: {
          p_lead_id: string;
          p_workspace_id: string;
          p_preserve_activities?: boolean;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
