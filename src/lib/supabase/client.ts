import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

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

let cachedBrowserClient: SupabaseClient<Database> | null = null;

/**
 * Returns a typed Supabase browser client with cookie handling via @supabase/ssr,
 * or null when credentials are not authentically configured.
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> | null {
  if (!isLiveSupabaseConfigured()) {
    return null;
  }

  if (!cachedBrowserClient) {
    cachedBrowserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  return cachedBrowserClient;
}
