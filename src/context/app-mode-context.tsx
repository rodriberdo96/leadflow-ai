'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { isLiveSupabaseConfigured } from '@/lib/supabase/client';

export type AppMode = 'demo' | 'production';

interface AppModeContextType {
  mode: AppMode;
  isDemo: boolean;
  isProduction: boolean;
  setMode: (mode: AppMode) => void;
  resetDemoData: () => void;
  canUseProduction: boolean;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

export const APP_MODE_STORAGE_KEY = 'leadflow_app_mode';
export const APP_MODE_COOKIE_KEY = 'leadflow_mode';

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const canUseProduction = isLiveSupabaseConfigured();

  // Mode defaults to 'demo' if Supabase is unconfigured, or reads stored preference
  const [mode, setModeState] = useState<AppMode>(() => {
    if (typeof window === 'undefined') return 'demo';
    if (!canUseProduction) return 'demo';

    const saved = localStorage.getItem(APP_MODE_STORAGE_KEY);
    if (saved === 'production' || saved === 'demo') {
      return saved;
    }
    return 'demo'; // Default to friendly exploratory demo until login
  });

  const setMode = useCallback(
    (newMode: AppMode) => {
      if (newMode === 'production' && !canUseProduction) {
        console.warn('[AppMode] Cannot switch to production: Supabase credentials are not configured.');
        return;
      }

      setModeState(newMode);
      if (typeof window !== 'undefined') {
        localStorage.setItem(APP_MODE_STORAGE_KEY, newMode);
        // Sync cookie for Next.js middleware route protection
        document.cookie = `${APP_MODE_COOKIE_KEY}=${newMode}; path=/; max-age=31536000; SameSite=Lax`;
      }
    },
    [canUseProduction]
  );

  // Sync mode cookie on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.cookie = `${APP_MODE_COOKIE_KEY}=${mode}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [mode]);

  const resetDemoData = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('leadflow_demo_leads_v1');
      localStorage.removeItem('leadflow_demo_tasks_v1');
      localStorage.removeItem('leadflow_demo_activities_v1');
      // Trigger a page reload or state reset
      window.location.reload();
    }
  }, []);

  return (
    <AppModeContext.Provider
      value={{
        mode,
        isDemo: mode === 'demo',
        isProduction: mode === 'production',
        setMode,
        resetDemoData,
        canUseProduction,
      }}
    >
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  const context = useContext(AppModeContext);
  if (!context) {
    throw new Error('useAppMode must be used within an AppModeProvider');
  }
  return context;
}

