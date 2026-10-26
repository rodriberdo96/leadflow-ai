import type { Lead, LeadActivity, LeadTask } from './lead';
import type { Workspace, WorkspaceMember, Subscription } from './workspace';

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: Workspace;
        Insert: Omit<Workspace, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
        };
        Update: Partial<Omit<Workspace, 'id'>>;
      };
      workspace_members: {
        Row: WorkspaceMember;
        Insert: Omit<WorkspaceMember, 'id' | 'created_at'> & {
          id?: string;
        };
        Update: Partial<Omit<WorkspaceMember, 'id'>>;
      };
      subscriptions: {
        Row: Subscription & { created_at: string; updated_at: string };
        Insert: Omit<Subscription, 'id'> & { id?: string };
        Update: Partial<Omit<Subscription, 'id'>>;
      };
      leads: {
        Row: Lead;
        Insert: Omit<Lead, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
        };
        Update: Partial<Omit<Lead, 'id'>>;
      };
      activities: {
        Row: LeadActivity;
        Insert: Omit<LeadActivity, 'id' | 'created_at'> & {
          id?: string;
        };
        Update: Partial<Omit<LeadActivity, 'id'>>;
      };
      tasks: {
        Row: LeadTask;
        Insert: Omit<LeadTask, 'id' | 'created_at'> & {
          id?: string;
        };
        Update: Partial<Omit<LeadTask, 'id'>>;
      };
      ai_usage: {
        Row: {
          id: string;
          workspace_id: string;
          user_id?: string;
          feature: 'classification' | 'summary' | 'reply_draft';
          tokens_used: number;
          model: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id?: string;
          feature: 'classification' | 'summary' | 'reply_draft';
          tokens_used: number;
          model: string;
          created_at?: string;
        };
        Update: Partial<{
          feature: 'classification' | 'summary' | 'reply_draft';
          tokens_used: number;
          model: string;
        }>;
      };
    };
  };
}
