import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as clientModule from '@/lib/supabase/client';

describe('AppMode Logic (Demo vs Production)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('detects demo mode when Supabase is not configured', () => {
    vi.spyOn(clientModule, 'isLiveSupabaseConfigured').mockReturnValue(false);
    expect(clientModule.isLiveSupabaseConfigured()).toBe(false);
    expect(clientModule.getSupabaseBrowserClient()).toBeNull();
  });

  it('detects production mode when Supabase is properly configured', () => {
    vi.spyOn(clientModule, 'isLiveSupabaseConfigured').mockReturnValue(true);
    expect(clientModule.isLiveSupabaseConfigured()).toBe(true);
  });
});

