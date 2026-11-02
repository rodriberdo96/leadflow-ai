import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

/**
 * Validates whether live Supabase client credentials are fully and authentically configured.
 * Rejects empty strings, placeholders, and malformed URLs.
 */
export function isLiveSupabaseConfigured(): boolean {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (supabaseUrl.includes('your-project') || supabaseUrl.includes('placeholder')) return false;
  if (supabaseAnonKey.includes('your-supabase') || supabaseAnonKey.includes('placeholder')) return false;
  try {
    const url = new URL(supabaseUrl);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = isLiveSupabaseConfigured();
export const isDemoMode = !isSupabaseConfigured;

let cachedBrowserClient: SupabaseClient<Database> | null = null;

/**
 * Returns a Supabase browser client if configured, or null in demo mode.
 * Never creates clients with fake/placeholder URLs.
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> | null {
  if (!isLiveSupabaseConfigured()) {
    return null;
  }

  if (!cachedBrowserClient) {
    cachedBrowserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return cachedBrowserClient;
}
