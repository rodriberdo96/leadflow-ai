'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAppMode } from './app-mode-context';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    companyName: string
  ) => Promise<{ error: Error | null; user: User | null }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setMode } = useAppMode();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setMode('production');
        }
        setIsLoading(false);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setMode('production');
        }
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, setMode]);

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<{ error: Error | null }> => {
      if (!supabase) {
        return { error: new Error('Supabase client is not configured.') };
      }

      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (!error && data.session) {
        setSession(data.session);
        setUser(data.user);
        setMode('production');
      }
      setIsLoading(false);

      return { error: error ? new Error(error.message) : null };
    },
    [supabase, setMode]
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      companyName: string
    ): Promise<{ error: Error | null; user: User | null }> => {
      if (!supabase) {
        return { error: new Error('Supabase client is not configured.'), user: null };
      }

      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            company_name: companyName.trim(),
          },
        },
      });

      if (!error && data.session) {
        setSession(data.session);
        setUser(data.user);
        setMode('production');
      }
      setIsLoading(false);

      return {
        error: error ? new Error(error.message) : null,
        user: data.user,
      };
    },
    [supabase, setMode]
  );

  const signOut = useCallback(async (): Promise<void> => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setMode('demo');
  }, [supabase, setMode]);

  const requestPasswordReset = useCallback(
    async (email: string): Promise<{ error: Error | null }> => {
      if (!supabase) {
        return { error: new Error('Supabase client is not configured.') };
      }

      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/reset-password`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      return { error: error ? new Error(error.message) : null };
    },
    [supabase]
  );

  const updatePassword = useCallback(
    async (password: string): Promise<{ error: Error | null }> => {
      if (!supabase) {
        return { error: new Error('Supabase client is not configured.') };
      }

      const { error } = await supabase.auth.updateUser({
        password,
      });

      return { error: error ? new Error(error.message) : null };
    },
    [supabase]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signInWithPassword,
        signUp,
        signOut,
        requestPasswordReset,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

