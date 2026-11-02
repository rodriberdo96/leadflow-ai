import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseUrl, supabaseAnonKey, isLiveSupabaseConfigured } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

function getSafeRedirectPath(candidate: string | null): string {
  if (!candidate) return '/dashboard';
  // Strictly prevent open redirects: must start with single '/', no '//', no backslashes, no URI schemes
  if (
    candidate.startsWith('/') &&
    !candidate.startsWith('//') &&
    !candidate.startsWith('/\\') &&
    !candidate.includes(':') &&
    !candidate.includes('\\')
  ) {
    return candidate;
  }
  return '/dashboard';
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const safeNext = getSafeRedirectPath(searchParams.get('next'));

  if (code && isLiveSupabaseConfigured()) {
    const response = NextResponse.redirect(`${origin}${safeNext}`);

    const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  // Return user to login if verification fails
  return NextResponse.redirect(`${origin}/login?error=Could+not+authenticate+user`);
}

