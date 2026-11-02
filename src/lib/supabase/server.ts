import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';
import { isLiveSupabaseConfigured, supabaseUrl, supabaseAnonKey } from './client';

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

/**
 * Validates whether the privileged service role key is configured.
 * Strictly server-only.
 */
export function isSupabaseAdminConfigured(): boolean {
  if (typeof window !== 'undefined') {
    return false;
  }
  if (!supabaseUrl || !supabaseServiceRoleKey) return false;
  if (
    supabaseServiceRoleKey.includes('your-supabase') ||
    supabaseServiceRoleKey.includes('placeholder')
  ) {
    return false;
  }
  return isLiveSupabaseConfigured();
}

/**
 * Returns an authenticated Supabase server client reading from Next.js cookies via @supabase/ssr.
 * Never falls back to the service-role key.
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient<Database> | null> {
  if (!isLiveSupabaseConfigured()) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
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
