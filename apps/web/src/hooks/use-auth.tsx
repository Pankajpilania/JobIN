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
import { createAuth0Client, type Auth0Client } from '@auth0/auth0-spa-js';
import type { User } from 'oidc-client-ts';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createOciUserManager } from '@/lib/oci-oidc';

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
  signOut: () => Promise<void>;
  startAuth: (
    mode: 'login' | 'signup',
    options?: { email?: string; returnTo?: string },
  ) => Promise<void>;
  profile: SessionProfile;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const AUTH0_ENABLED = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'auth0';
const OCI_ENABLED = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'oci';
const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
const auth0ClientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
const auth0Audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE;

function getSafeReturnTo(value: string | undefined) {
  if (!value) return '/dashboard';
  const url = new URL(value, window.location.origin);
  return url.origin === window.location.origin
    ? `${url.pathname}${url.search}${url.hash}`
    : '/dashboard';
}

function resetIdleTracking(userId: string) {
  window.localStorage.setItem(`jobin:last-activity:${userId}`, String(Date.now()));
  window.localStorage.removeItem(`jobin:idle-signout:${userId}`);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return OCI_ENABLED ? (
    <OciSessionProvider>{children}</OciSessionProvider>
  ) : AUTH0_ENABLED ? (
    <Auth0SessionProvider>{children}</Auth0SessionProvider>
  ) : (
    <SupabaseSessionProvider>{children}</SupabaseSessionProvider>
  );
}

function useIdleSignOut(isReady: boolean, userId: string | null, signOut: () => Promise<void>) {
  useEffect(() => {
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
      try {
        await signOut();
        window.localStorage.setItem(signOutKey, String(Date.now()));
        window.location.replace('/sign-in?reason=inactivity');
      } catch (error) {
        console.error('Automatic sign-out after inactivity failed.', error);
        retryTimer = window.setTimeout(() => {
          signingOut = false;
          void expireSession();
        }, 30_000);
      }
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
  }, [isReady, signOut, userId]);
}

function SupabaseSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const eventVersion = useRef(0);

  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      eventVersion.current += 1;
      if (active) {
        if (event === 'SIGNED_IN' && nextSession?.user.id) {
          resetIdleTracking(nextSession.user.id);
        }
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
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    return currentSession?.access_token ?? null;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const startAuth = useCallback(async () => {
    throw new Error('Auth0 sign-in is not enabled.');
  }, []);

  useIdleSignOut(isReady, session?.user.id ?? null, signOut);

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
      signOut,
      startAuth,
      profile,
    }),
    [getToken, isReady, profile, session, signOut, startAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function Auth0SessionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [client, setClient] = useState<Auth0Client | null>(null);
  const [identity, setIdentity] = useState<{
    sub: string;
    name?: string;
    email?: string;
    picture?: string;
  } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [initializationError, setInitializationError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      if (!auth0Domain || !auth0ClientId || !auth0Audience) {
        throw new Error(
          'Auth0 is selected but NEXT_PUBLIC_AUTH0_DOMAIN, NEXT_PUBLIC_AUTH0_CLIENT_ID, or NEXT_PUBLIC_AUTH0_AUDIENCE is missing.',
        );
      }

      const auth0 = await createAuth0Client({
        domain: auth0Domain.replace(/^https?:\/\//i, '').replace(/\/+$/, ''),
        clientId: auth0ClientId,
        authorizationParams: {
          audience: auth0Audience,
          redirect_uri: window.location.origin,
          scope: 'openid profile email offline_access',
        },
        cacheLocation: 'memory',
        useRefreshTokens: true,
      });

      if (!active) return;
      setClient(auth0);

      const params = new URLSearchParams(window.location.search);
      let callbackReturnTo: string | null = null;
      if (params.has('code') && params.has('state')) {
        const { appState } = await auth0.handleRedirectCallback();
        window.history.replaceState({}, document.title, window.location.pathname);
        callbackReturnTo = getSafeReturnTo(appState?.returnTo);
      }

      const [authenticated, user] = await Promise.all([auth0.isAuthenticated(), auth0.getUser()]);
      if (!active) return;
      if (callbackReturnTo && authenticated && user?.sub) {
        resetIdleTracking(user.sub);
      }
      setIdentity(authenticated && user?.sub ? { ...user, sub: user.sub } : null);
      setIsReady(true);
      if (callbackReturnTo && callbackReturnTo !== window.location.pathname) {
        router.replace(callbackReturnTo);
      }
    };

    void initialize().catch((error: unknown) => {
      if (!active) return;
      const initializationError =
        error instanceof Error ? error : new Error('Auth0 initialization failed.');
      console.error('Auth0 initialization failed.', initializationError);
      setInitializationError(initializationError);
      setIsReady(true);
    });

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    const isPublicRoute =
      pathname === '/' ||
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/sign-in') ||
      pathname.startsWith('/sign-up') ||
      pathname.startsWith('/forgot-password') ||
      pathname.startsWith('/reset-password') ||
      pathname.startsWith('/admin-login');
    if (!isReady || identity || isPublicRoute) return;

    const next = `${pathname}${window.location.search}`;
    const destination = pathname.startsWith('/admin') ? '/admin-login' : '/sign-in';
    router.replace(`${destination}?next=${encodeURIComponent(next)}`);
  }, [identity, isReady, pathname, router]);

  const getToken = useCallback(async () => {
    if (!client) return null;
    return (await client.getTokenSilently()) ?? null;
  }, [client]);

  const signOut = useCallback(async () => {
    if (!client) throw new Error('Auth0 is not initialized.');
    await client.logout({ logoutParams: { returnTo: window.location.origin } });
  }, [client]);

  const startAuth = useCallback(
    async (mode: 'login' | 'signup', options?: { email?: string; returnTo?: string }) => {
      if (initializationError) throw initializationError;
      if (!client) throw new Error('Auth0 is not initialized.');
      await client.loginWithRedirect({
        appState: { returnTo: getSafeReturnTo(options?.returnTo) },
        authorizationParams: {
          ...(mode === 'signup' ? { screen_hint: 'signup' } : {}),
          ...(options?.email ? { login_hint: options.email } : {}),
        },
      });
    },
    [client, initializationError],
  );

  useIdleSignOut(isReady, identity?.sub ?? null, signOut);

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      isSignedIn: Boolean(identity),
      userId: identity?.sub ?? null,
      getToken,
      signOut,
      startAuth,
      profile: {
        fullName: identity?.name ?? '',
        email: identity?.email ?? '',
        avatarUrl: identity?.picture,
      },
    }),
    [getToken, identity, isReady, signOut, startAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function OciSessionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [manager, setManager] = useState<ReturnType<typeof createOciUserManager> | null>(null);
  const [identity, setIdentity] = useState<{
    sub: string;
    name?: string;
    email?: string;
    picture?: string;
  } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [initializationError, setInitializationError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      const userManager = createOciUserManager();
      const updateIdentity = (user: User | null) => {
        const subject = user?.profile.sub;
        setIdentity(
          !user || user.expired || typeof subject !== 'string'
            ? null
            : {
                sub: subject,
                name: typeof user.profile.name === 'string' ? user.profile.name : undefined,
                email: typeof user.profile.email === 'string' ? user.profile.email : undefined,
                picture: typeof user.profile.picture === 'string' ? user.profile.picture : undefined,
              },
        );
      };

      userManager.events.addUserLoaded(updateIdentity);
      userManager.events.addUserUnloaded(() => setIdentity(null));
      if (!active) return;
      setManager(userManager);

      const params = new URLSearchParams(window.location.search);
      const providerError = params.get('error');
      if (providerError) {
        throw new Error(params.get('error_description') || providerError);
      }

      let user: User | null;
      let callbackReturnTo: string | null = null;
      if (params.has('code') && params.has('state')) {
        user = await userManager.signinRedirectCallback();
        const state = user.state;
        if (state && typeof state === 'object' && 'returnTo' in state) {
          callbackReturnTo =
            typeof state.returnTo === 'string' ? getSafeReturnTo(state.returnTo) : null;
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        user = await userManager.getUser();
      }

      if (user?.expired) {
        try {
          user = await userManager.signinSilent();
        } catch (error) {
          console.warn('OCI session refresh failed; the user must sign in again.', error);
          await userManager.removeUser();
          user = null;
        }
      }

      if (!active) return;
      if (callbackReturnTo && user && !user.expired && typeof user.profile.sub === 'string') {
        resetIdleTracking(user.profile.sub);
      }
      updateIdentity(user);
      setIsReady(true);
      if (callbackReturnTo && callbackReturnTo !== window.location.pathname) {
        router.replace(callbackReturnTo);
      }
    };

    void initialize().catch((error: unknown) => {
      if (!active) return;
      const initializationError =
        error instanceof Error ? error : new Error('OCI sign-in initialization failed.');
      console.error('OCI sign-in initialization failed.', initializationError);
      setInitializationError(initializationError);
      setIsReady(true);
    });

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    const isPublicRoute =
      pathname === '/' ||
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/sign-in') ||
      pathname.startsWith('/sign-up') ||
      pathname.startsWith('/forgot-password') ||
      pathname.startsWith('/reset-password') ||
      pathname.startsWith('/admin-login');
    if (!isReady || identity || isPublicRoute) return;

    const next = `${pathname}${window.location.search}`;
    const destination = pathname.startsWith('/admin') ? '/admin-login' : '/sign-in';
    router.replace(`${destination}?next=${encodeURIComponent(next)}`);
  }, [identity, isReady, pathname, router]);

  const getToken = useCallback(async () => {
    if (!manager) return null;
    let user = await manager.getUser();
    if (!user) return null;
    if (user.expired) user = await manager.signinSilent();
    return user?.access_token ?? null;
  }, [manager]);

  const signOut = useCallback(async () => {
    if (!manager) throw new Error('OCI sign-in is not initialized.');
    await manager.signoutRedirect({ post_logout_redirect_uri: window.location.origin });
  }, [manager]);

  const startAuth = useCallback(
    async (mode: 'login' | 'signup', options?: { email?: string; returnTo?: string }) => {
      if (initializationError) throw initializationError;
      if (!manager) throw new Error('OCI sign-in is not initialized.');
      await manager.signinRedirect({
        state: { returnTo: getSafeReturnTo(options?.returnTo) },
        extraQueryParams: options?.email ? { login_hint: options.email } : undefined,
        prompt: mode === 'login' ? 'login' : undefined,
      });
    },
    [initializationError, manager],
  );

  useIdleSignOut(isReady, identity?.sub ?? null, signOut);

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      isSignedIn: Boolean(identity),
      userId: identity?.sub ?? null,
      getToken,
      signOut,
      startAuth,
      profile: {
        fullName: identity?.name ?? '',
        email: identity?.email ?? '',
        avatarUrl: identity?.picture,
      },
    }),
    [getToken, identity, isReady, signOut, startAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
