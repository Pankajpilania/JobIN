'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
const SESSION_IDLE_TIMEOUT_MS = 10 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const eventVersion = useRef(0);

  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
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

  useEffect(() => {
    const userId = session?.user.id;
    if (!isReady || !userId) return;

    const activityKey = `jobin:last-activity:${userId}`;
    const signOutKey = `jobin:idle-signout:${userId}`;
    const storedActivity = Number(window.localStorage.getItem(activityKey));
    let lastActivity =
      Number.isFinite(storedActivity) && storedActivity > 0 ? storedActivity : Date.now();
    let timer: number;
    let retryTimer: number | undefined;
    let signingOut = false;

    window.localStorage.setItem(activityKey, String(lastActivity));

    const scheduleCheck = () => {
      window.clearTimeout(timer);
      const remaining = SESSION_IDLE_TIMEOUT_MS - (Date.now() - lastActivity);
      timer = window.setTimeout(checkIdle, Math.max(remaining, 0));
    };

    const expireSession = async () => {
      if (signingOut) return;
      signingOut = true;
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Automatic sign-out after inactivity failed.', error);
        retryTimer = window.setTimeout(() => {
          signingOut = false;
          void expireSession();
        }, 30_000);
        return;
      }
      window.localStorage.setItem(signOutKey, String(Date.now()));
      window.location.replace('/sign-in?reason=inactivity');
    };

    const checkIdle = () => {
      const sharedActivity = Number(window.localStorage.getItem(activityKey));
      if (Number.isFinite(sharedActivity) && sharedActivity > lastActivity) {
        lastActivity = sharedActivity;
      }
      if (Date.now() - lastActivity >= SESSION_IDLE_TIMEOUT_MS) {
        void expireSession();
        return;
      }
      scheduleCheck();
    };

    let lastActivityWrite = 0;
    const recordActivity = () => {
      const now = Date.now();
      if (now - lastActivityWrite < 1000) return;
      lastActivity = now;
      lastActivityWrite = now;
      window.localStorage.setItem(activityKey, String(now));
      scheduleCheck();
    };

    const syncSharedActivity = (event: StorageEvent) => {
      if (event.key === signOutKey && event.newValue) {
        window.location.replace('/sign-in?reason=inactivity');
        return;
      }
      if (event.key !== activityKey || !event.newValue) return;
      const sharedActivity = Number(event.newValue);
      if (Number.isFinite(sharedActivity) && sharedActivity > lastActivity) {
        lastActivity = sharedActivity;
        scheduleCheck();
      }
    };

    const checkOnVisibility = () => {
      if (document.visibilityState === 'visible') checkIdle();
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'touchstart',
      'wheel',
      'scroll',
    ];
    activityEvents.forEach((event) =>
      window.addEventListener(event, recordActivity, { passive: true }),
    );
    window.addEventListener('storage', syncSharedActivity);
    window.addEventListener('focus', checkIdle);
    document.addEventListener('visibilitychange', checkOnVisibility);
    checkIdle();

    return () => {
      window.clearTimeout(timer);
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      activityEvents.forEach((event) => window.removeEventListener(event, recordActivity));
      window.removeEventListener('storage', syncSharedActivity);
      window.removeEventListener('focus', checkIdle);
      document.removeEventListener('visibilitychange', checkOnVisibility);
    };
  }, [isReady, session?.user.id]);

  const getToken = useCallback(async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
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

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      isSignedIn: Boolean(session),
      userId: session?.user.id ?? null,
      getToken,
      profile,
    }),
    [getToken, isReady, profile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
