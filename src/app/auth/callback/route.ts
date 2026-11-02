import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseUrl, supabaseAnonKey, isLiveSupabaseConfigured } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code && isLiveSupabaseConfigured()) {
    const response = NextResponse.redirect(`${origin}${next}`);

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

