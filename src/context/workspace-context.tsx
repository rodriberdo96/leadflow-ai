'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
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
  activeWorkspace: ActiveWorkspace | null;
  workspaces: Workspace[];
  memberships: WorkspaceMember[];
  isLoading: boolean;
  error: Error | null;
  createWorkspace: (name: string, slug?: string) => Promise<{ workspaceId?: string; error?: Error }>;
  refreshWorkspaces: () => Promise<void>;
}

export const DEMO_WORKSPACE: ActiveWorkspace = {
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

  // In production, activeWorkspace must NEVER be DEMO_WORKSPACE under any circumstances (including unauthenticated)
  const [activeWorkspace, setActiveWorkspace] = useState<ActiveWorkspace | null>(() => {
    return isProduction ? null : DEMO_WORKSPACE;
  });
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [memberships, setMemberships] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const prevUserIdRef = useRef<string | null | undefined>(user?.id);
  const prevModeRef = useRef<boolean>(isProduction);
  const creationInProgressRef = useRef(false);
  const inFlightRefreshRef = useRef<Promise<void> | null>(null);

  const supabaseClient = getSupabaseBrowserClient();
  const supabase = supabaseClient as unknown as import('@supabase/supabase-js').SupabaseClient | null;

  const refreshWorkspaces = useCallback(async (): Promise<void> => {
    // Demo Mode handling: explicitly isolate from production
    if (!isProduction) {
      setActiveWorkspace(DEMO_WORKSPACE);
      setWorkspaces([]);
      setMemberships([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    // In production mode: if unauthenticated or no supabase client, activeWorkspace MUST be null
    if (!user || !supabase) {
      setActiveWorkspace(null);
      setWorkspaces([]);
      setMemberships([]);
      setIsLoading(false);
      return;
    }

    if (inFlightRefreshRef.current) {
      return inFlightRefreshRef.current;
    }

    const currentUserId = user.id;

    const refreshPromise = (async () => {
      // Clear active workspace when production workspace loading begins
      setActiveWorkspace(null);
      setWorkspaces([]);
      setMemberships([]);
      setIsLoading(true);
      setError(null);

      try {
        // 1. Fetch user memberships
        const { data: memberRows, error: memberErr } = await supabase
          .from('workspace_members')
          .select('*')
          .eq('user_id', currentUserId);

        if (memberErr) throw new Error(memberErr.message);

        // Abort if user changed while request was in-flight
        if (prevUserIdRef.current !== currentUserId) {
          return;
        }

        const membershipsList = (memberRows as unknown as WorkspaceMember[]) || [];
        setMemberships(membershipsList);

        if (!membershipsList || membershipsList.length === 0) {
          // Guard against concurrent creation races
          if (creationInProgressRef.current) {
            return;
          }
          creationInProgressRef.current = true;

          try {
            const companyName =
              (user.user_metadata?.company_name as string) ||
              `${(user.user_metadata?.full_name as string) || 'My'}'s Agency`;

            const newSlug = `${slugify(companyName)}-${Date.now().toString(36)}`;

            const { data: newWsId, error: createErr } = await supabase.rpc('create_workspace', {
              name: companyName,
              slug: newSlug,
            });

            if (createErr) {
              throw new Error(`Failed to initialize default workspace: ${createErr.message}`);
            }

            if (prevUserIdRef.current !== currentUserId) {
              return;
            }

            const { data: createdWs, error: fetchCreatedErr } = await supabase
              .from('workspaces')
              .select('*')
              .eq('id', newWsId)
              .single();

            if (fetchCreatedErr) throw new Error(fetchCreatedErr.message);

            if (createdWs && prevUserIdRef.current === currentUserId) {
              const ws = createdWs as unknown as Workspace;
              setWorkspaces([ws]);
              setActiveWorkspace({
                id: ws.id,
                name: ws.name,
                slug: ws.slug,
                role: 'owner',
              });
            }
          } finally {
            creationInProgressRef.current = false;
          }
        } else {
          // User has existing memberships -> fetch the workspaces
          const wsIds = membershipsList.map((m) => m.workspace_id);
          const { data: wsRows, error: wsErr } = await supabase
            .from('workspaces')
            .select('*')
            .in('id', wsIds);

          if (wsErr) throw new Error(wsErr.message);

          if (prevUserIdRef.current !== currentUserId) {
            return;
          }

          const loadedWorkspaces = (wsRows as unknown as Workspace[]) || [];
          setWorkspaces(loadedWorkspaces);

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
        // Clear stale workspace state when memberships or workspace loading fail
        setActiveWorkspace(null);
        setWorkspaces([]);
        setMemberships([]);
        setError(err instanceof Error ? err : new Error('Failed to load workspace.'));
      } finally {
        setIsLoading(false);
        inFlightRefreshRef.current = null;
      }
    })();

    inFlightRefreshRef.current = refreshPromise;
    return refreshPromise;
  }, [isProduction, user, supabase]);

  useEffect(() => {
    // Detect user logout or user change immediately
    const userChanged = prevUserIdRef.current !== user?.id;
    const modeChanged = prevModeRef.current !== isProduction;
    prevUserIdRef.current = user?.id;
    prevModeRef.current = isProduction;

    if (userChanged || modeChanged) {
      // Invalidate any active in-flight request on user or mode change
      inFlightRefreshRef.current = null;
    }

    const timer = setTimeout(() => {
      if (isProduction) {
        if (user) {
          void refreshWorkspaces();
        } else {
          setActiveWorkspace(null);
          setWorkspaces([]);
          setMemberships([]);
          setIsLoading(false);
        }
      } else {
        setActiveWorkspace(DEMO_WORKSPACE);
        setWorkspaces([]);
        setMemberships([]);
        setError(null);
        setIsLoading(false);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isProduction, user, refreshWorkspaces]);

  const createWorkspace = useCallback(
    async (name: string, customSlug?: string): Promise<{ workspaceId?: string; error?: Error }> => {
      if (!isProduction || !user || !supabase) {
        return { error: new Error('Workspace creation requires authenticated production mode.') };
      }

      setIsLoading(true);
      try {
        const finalSlug = customSlug ? slugify(customSlug) : `${slugify(name)}-${Date.now().toString(36)}`;

        const { data: newId, error: rpcErr } = await supabase.rpc('create_workspace', {
          name: name.trim(),
          slug: finalSlug,
        });

        if (rpcErr) {
          throw new Error(rpcErr.message);
        }

        await refreshWorkspaces();
        return { workspaceId: newId as string };
      } catch (err) {
        const createError = err instanceof Error ? err : new Error('Failed to create workspace.');
        setError(createError);
        return { error: createError };
      } finally {
        setIsLoading(false);
      }
    },
    [isProduction, user, supabase, refreshWorkspaces]
  );

  const value = useMemo<WorkspaceContextType>(
    () => ({
      activeWorkspace,
      workspaces,
      memberships,
      isLoading,
      error,
      createWorkspace,
      refreshWorkspaces,
    }),
    [activeWorkspace, workspaces, memberships, isLoading, error, createWorkspace, refreshWorkspaces]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
