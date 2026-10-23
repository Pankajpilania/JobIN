'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface SessionProfile {
  fullName: string;
  email: string;
  avatarUrl?: string;
}

interface AuthContextValue {
  isReady: boolean;
  isSignedIn: boolean;
  userId: string | null;
  getToken: () => Promise<string | null>;
  profile: SessionProfile;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const eventVersion = useRef(0);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      eventVersion.current += 1;
      if (active) {
        setSession(nextSession);
        setIsReady(true);
      }
    });

    const versionAtStart = eventVersion.current;
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (!active) return;
      if (eventVersion.current === versionAtStart) {
        if (!error) setSession(initialSession);
        setIsReady(true);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const getToken = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    return currentSession?.access_token ?? null;
  }, []);

  const profile = useMemo<SessionProfile>(() => {
    const metadata = session?.user.user_metadata ?? {};
    return {
      fullName: metadata.full_name ?? metadata.name ?? '',
      email: session?.user.email ?? '',
      avatarUrl: metadata.avatar_url ?? metadata.picture,
    };
  }, [session]);

  const value = useMemo<AuthContextValue>(() => ({
    isReady,
    isSignedIn: Boolean(session),
    userId: session?.user.id ?? null,
    getToken,
    profile,
  }), [getToken, isReady, profile, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
