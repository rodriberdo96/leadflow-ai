'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Workspace, WorkspaceMember } from '@/types/workspace';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from './auth-context';
import { useAppMode } from './app-mode-context';

export interface ActiveWorkspace {
  id: string;
  name: string;
  slug: string;
  role: 'owner' | 'admin' | 'member';
}

interface WorkspaceContextType {
  activeWorkspace: ActiveWorkspace;
  workspaces: Workspace[];
  memberships: WorkspaceMember[];
  isLoading: boolean;
  error: Error | null;
  createWorkspace: (name: string, slug?: string) => Promise<{ workspaceId?: string; error?: Error }>;
  refreshWorkspaces: () => Promise<void>;
}

const DEMO_WORKSPACE: ActiveWorkspace = {
  id: 'ws-demo-1',
  name: 'Velocity Digital Agency',
  slug: 'velocity-digital',
  role: 'owner',
};

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isProduction } = useAppMode();

  const [activeWorkspace, setActiveWorkspace] = useState<ActiveWorkspace>(DEMO_WORKSPACE);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [memberships, setMemberships] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const supabase = getSupabaseBrowserClient();

  const refreshWorkspaces = useCallback(async () => {
    if (!isProduction || !user || !supabase) {
      setActiveWorkspace(DEMO_WORKSPACE);
      setWorkspaces([]);
      setMemberships([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch user memberships
      const { data: memberRows, error: memberErr } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('user_id', user.id);

      if (memberErr) throw new Error(memberErr.message);

      const membershipsList = (memberRows as unknown as WorkspaceMember[]) || [];
      setMemberships(membershipsList);

      if (!membershipsList || membershipsList.length === 0) {
        // User has no workspace yet -> check user metadata to auto-create onboarding workspace
        const companyName =
          (user.user_metadata?.company_name as string) ||
          `${user.user_metadata?.full_name || 'My'}'s Agency`;

        const newSlug = `${slugify(companyName)}-${Date.now().toString(36)}`;

        // Call RPC create_workspace
        const { data: newWsId, error: createErr } = await (supabase.rpc as any)(
          'create_workspace',
          {
            name: companyName,
            slug: newSlug,
          }
        );

        if (createErr) {
          throw new Error(`Failed to initialize default workspace: ${createErr.message}`);
        }

        // Recursively refresh after creation
        const { data: createdWs } = await supabase
          .from('workspaces')
          .select('*')
          .eq('id', newWsId as string)
          .single();

        if (createdWs) {
          const ws = createdWs as Workspace;
          setWorkspaces([ws]);
          setActiveWorkspace({
            id: ws.id,
            name: ws.name,
            slug: ws.slug,
            role: 'owner',
          });
        }
      } else {
        // 2. User has existing memberships -> fetch the workspaces
        const wsIds = membershipsList.map((m) => m.workspace_id);
        const { data: wsRows, error: wsErr } = await supabase
          .from('workspaces')
          .select('*')
          .in('id', wsIds);

        if (wsErr) throw new Error(wsErr.message);

        const loadedWorkspaces = (wsRows as unknown as Workspace[]) || [];
        setWorkspaces(loadedWorkspaces);

        // Select the first workspace or preserve active if matching
        if (loadedWorkspaces.length > 0) {
          const firstWs = loadedWorkspaces[0];
          const matchedMember = membershipsList.find((m) => m.workspace_id === firstWs.id);
          setActiveWorkspace({
            id: firstWs.id,
            name: firstWs.name,
            slug: firstWs.slug,
            role: (matchedMember?.role as 'owner' | 'admin' | 'member') || 'member',
          });
        }
      }
    } catch (err) {
      console.error('[WorkspaceProvider] Error fetching workspaces:', err);
      setError(err instanceof Error ? err : new Error('Failed to load workspace.'));
    } finally {
      setIsLoading(false);
    }
  }, [isProduction, user, supabase]);

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const createWorkspace = useCallback(
    async (name: string, customSlug?: string): Promise<{ workspaceId?: string; error?: Error }> => {
      if (!isProduction || !user || !supabase) {
        return { error: new Error('Workspace creation requires authenticated production mode.') };
      }

      setIsLoading(true);
      setError(null);

      try {
        const slug = customSlug?.trim() || `${slugify(name)}-${Date.now().toString(36)}`;
        const { data: newWsId, error: rpcErr } = await (supabase.rpc as any)('create_workspace', {
          name: name.trim(),
          slug,
        });

        if (rpcErr) throw new Error(rpcErr.message);

        await refreshWorkspaces();
        return { workspaceId: newWsId as string };
      } catch (err) {
        const createError = err instanceof Error ? err : new Error('Failed to create workspace');
        setError(createError);
        return { error: createError };
      } finally {
        setIsLoading(false);
      }
    },
    [isProduction, user, supabase, refreshWorkspaces]
  );

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspace,
        workspaces,
        memberships,
        isLoading,
        error,
        createWorkspace,
        refreshWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
