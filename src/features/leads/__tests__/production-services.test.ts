import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabaseLeadsService, supabaseTasksService, supabaseActivitiesService } from '../production/supabase-leads-service';
import * as clientModule from '@/lib/supabase/client';

describe('Production Mode Supabase Services (Milestone 2)', () => {
  const mockWorkspaceId = 'ws-real-123';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws SupabaseServiceError if client is not configured', async () => {
    vi.spyOn(clientModule, 'getSupabaseBrowserClient').mockReturnValue(null);

    await expect(supabaseLeadsService.getLeads(mockWorkspaceId)).rejects.toThrow(
      /Supabase client is not configured/
    );

    await expect(supabaseTasksService.getTasks(mockWorkspaceId)).rejects.toThrow(
      /Supabase client is not configured/
    );

    await expect(supabaseActivitiesService.getActivities(mockWorkspaceId)).rejects.toThrow(
      /Supabase client is not configured/
    );
  });

  it('queries leads strictly scoped by workspace_id', async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: [{ id: 'lead-1', workspace_id: mockWorkspaceId, name: 'Acme Lead' }],
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    // Mock supabase client
    vi.spyOn(clientModule, 'getSupabaseBrowserClient').mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof clientModule.getSupabaseBrowserClient>);

    const leads = await supabaseLeadsService.getLeads(mockWorkspaceId);

    expect(mockFrom).toHaveBeenCalledWith('leads');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('workspace_id', mockWorkspaceId);
    expect(leads).toHaveLength(1);
    expect(leads[0].name).toBe('Acme Lead');
  });

  it('handles database errors gracefully by wrapping them in SupabaseServiceError', async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database connection timeout', code: '57P01' },
    });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    vi.spyOn(clientModule, 'getSupabaseBrowserClient').mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof clientModule.getSupabaseBrowserClient>);

    await expect(supabaseLeadsService.getLeads(mockWorkspaceId)).rejects.toThrow(
      /Database connection timeout/
    );
  });
});

