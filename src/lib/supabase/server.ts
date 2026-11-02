import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { isLiveSupabaseConfigured } from './client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

/**
 * Validates whether the privileged service role key is configured.
 * Never leaks to the client.
 */
export function isSupabaseAdminConfigured(): boolean {
  if (typeof window !== 'undefined') {
    return false; // Strictly server-only
  }
  if (!supabaseUrl || !supabaseServiceRoleKey) return false;
  if (supabaseServiceRoleKey.includes('your-supabase') || supabaseServiceRoleKey.includes('placeholder')) {
    return false;
  }
  return isLiveSupabaseConfigured();
}

/**
 * Returns an authenticated Supabase server client scoped to a user session or token.
 * Uses ONLY the public anon key with the optional user's JWT authorization header.
 * NEVER falls back to the service-role key.
 */
export function getSupabaseServerClient(jwtToken?: string): SupabaseClient<Database> | null {
  if (!isLiveSupabaseConfigured()) {
    return null;
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {},
    },
  });
}

/**
 * Returns a privileged Supabase admin client using the service-role key.
 * Strictly forbidden in the browser; throws if called client-side or without valid service key.
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (typeof window !== 'undefined') {
    throw new Error('SECURITY VIOLATION: getSupabaseAdminClient cannot be called client-side.');
  }

  if (!isSupabaseAdminConfigured()) {
    throw new Error(
      'Supabase admin client error: SUPABASE_SERVICE_ROLE_KEY is missing or invalid in server environment.'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
