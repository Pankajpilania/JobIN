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
  prepareForSupabaseAuth: () => Promise<void>;
  startGoogleAuth: (options?: { returnTo?: string }) => Promise<void>;
  startAuth: (
    mode: 'login' | 'signup',
    options?: { email?: string; returnTo?: string },
  ) => Promise<void>;
  profile: SessionProfile;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const SUPABASE_AUTH_PENDING_KEY = 'jobin:supabase-auth-pending';
const SUPABASE_AUTH_PENDING_TTL_MS = 30 * 60 * 1000;
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

function markSupabaseAuthPending() {
  window.localStorage.setItem(SUPABASE_AUTH_PENDING_KEY, String(Date.now()));
}

function initializeSupabaseIdleTracking(event: string, session: Session | null) {
  if (event === 'SIGNED_IN' && session?.user.id) {
    resetIdleTracking(session.user.id);
    window.localStorage.removeItem(SUPABASE_AUTH_PENDING_KEY);
    return;
  }

  if (event !== 'INITIAL_SESSION') return;

  const pendingSince = Number(window.localStorage.getItem(SUPABASE_AUTH_PENDING_KEY));
  if (
    session?.user.id &&
    Number.isFinite(pendingSince) &&
    pendingSince > 0 &&
    Date.now() - pendingSince <= SUPABASE_AUTH_PENDING_TTL_MS
  ) {
    resetIdleTracking(session.user.id);
  }
  window.localStorage.removeItem(SUPABASE_AUTH_PENDING_KEY);
}

async function startSupabaseGoogleAuth(
  supabase: ReturnType<typeof createClient>,
  returnTo?: string,
) {
  const next = getSafeReturnTo(returnTo);
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  markSupabaseAuthPending();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) {
    window.localStorage.removeItem(SUPABASE_AUTH_PENDING_KEY);
    throw error;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute =
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/admin-login' ||
    pathname.startsWith('/admin-login/');

  if (isAdminRoute) {
    return <SupabaseSessionProvider signInPath="/admin-login">{children}</SupabaseSessionProvider>;
  }

  return OCI_ENABLED ? (
    <OciSessionProvider>{children}</OciSessionProvider>
  ) : AUTH0_ENABLED ? (
    <Auth0SessionProvider>{children}</Auth0SessionProvider>
  ) : (
    <SupabaseSessionProvider>{children}</SupabaseSessionProvider>
  );
}

function useIdleSignOut(
  isReady: boolean,
  userId: string | null,
  signOut: () => Promise<void>,
  signInPath = '/sign-in',
) {
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
        window.location.replace(`${signInPath}?reason=inactivity`);
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
  }, [isReady, signInPath, signOut, userId]);
}

function SupabaseSessionProvider({
  children,
  signInPath = '/sign-in',
}: {
  children: React.ReactNode;
  signInPath?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const auth = supabase.auth;
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const eventVersion = useRef(0);

  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = auth.onAuthStateChange((event, nextSession) => {
      eventVersion.current += 1;
      if (active) {
        initializeSupabaseIdleTracking(event, nextSession);
        setSession(nextSession);
        setIsReady(true);
      }
    });

    const versionAtStart = eventVersion.current;
    auth.getSession().then(({ data: { session: initialSession }, error }) => {
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
  }, [auth]);

  const getToken = useCallback(async () => {
    const {
      data: { session: currentSession },
    } = await auth.getSession();
    return currentSession?.access_token ?? null;
  }, [auth]);

  const signOut = useCallback(async () => {
    const { error } = await auth.signOut();
    if (error) throw error;
  }, [auth]);

  const prepareForSupabaseAuth = useCallback(async () => {
    markSupabaseAuthPending();
  }, []);

  const startGoogleAuth = useCallback(
    (options?: { returnTo?: string }) => startSupabaseGoogleAuth(supabase, options?.returnTo),
    [supabase],
  );

  const startAuth = useCallback(async () => {
    throw new Error('Auth0 sign-in is not enabled.');
  }, []);

  useIdleSignOut(isReady, session?.user.id ?? null, signOut, signInPath);

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
      prepareForSupabaseAuth,
      startGoogleAuth,
      startAuth,
      profile,
    }),
    [getToken, isReady, prepareForSupabaseAuth, profile, session, signOut, startAuth, startGoogleAuth],
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
      const completedAuthCallback = params.has('code') && params.has('state');
      if (completedAuthCallback) {
        const { appState } = await auth0.handleRedirectCallback();
        window.history.replaceState({}, document.title, window.location.pathname);
        callbackReturnTo = getSafeReturnTo(appState?.returnTo);
      }

      const [authenticated, user] = await Promise.all([auth0.isAuthenticated(), auth0.getUser()]);
      if (!active) return;
      if (completedAuthCallback && authenticated && user?.sub) {
        resetIdleTracking(user.sub);
      }
      setIdentity(authenticated && user?.sub ? { ...user, sub: user.sub } : null);
      setIsReady(true);
      if (completedAuthCallback) {
        const returnTo = callbackReturnTo ?? '/dashboard';
        if (returnTo !== window.location.pathname) router.replace(returnTo);
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

  const startGoogleAuth = useCallback(async () => {
    throw new Error('Google sign-in through Supabase is not available with Auth0.');
  }, []);

  const prepareForSupabaseAuth = useCallback(async () => {}, []);

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
      prepareForSupabaseAuth,
      startGoogleAuth,
      startAuth,
      profile: {
        fullName: identity?.name ?? '',
        email: identity?.email ?? '',
        avatarUrl: identity?.picture,
      },
    }),
    [getToken, identity, isReady, prepareForSupabaseAuth, signOut, startAuth, startGoogleAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function OciSessionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const auth = supabase.auth;
  const [manager, setManager] = useState<ReturnType<typeof createOciUserManager> | null>(null);
  const [ociIdentity, setOciIdentity] = useState<{
    sub: string;
    name?: string;
    email?: string;
    picture?: string;
  } | null>(null);
  const [ociReady, setOciReady] = useState(false);
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [initializationError, setInitializationError] = useState<Error | null>(null);
  const supabaseEventVersion = useRef(0);
  const identity = useMemo(
    () =>
      ociIdentity ??
      (supabaseSession
        ? {
            sub: supabaseSession.user.id,
            name:
              supabaseSession.user.user_metadata.full_name ??
              supabaseSession.user.user_metadata.name,
            email: supabaseSession.user.email,
            picture:
              supabaseSession.user.user_metadata.avatar_url ??
              supabaseSession.user.user_metadata.picture,
          }
        : null),
    [ociIdentity, supabaseSession],
  );
  const isReady = ociReady && supabaseReady;

  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      supabaseEventVersion.current += 1;
      initializeSupabaseIdleTracking(event, nextSession);
      setSupabaseSession(nextSession);
      setSupabaseReady(true);
    });

    const versionAtStart = supabaseEventVersion.current;
    auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (!active) return;
      if (error) {
        console.error('Supabase session initialization failed.', error);
      } else if (supabaseEventVersion.current === versionAtStart) {
        setSupabaseSession(initialSession);
      }
      setSupabaseReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [auth]);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      const userManager = createOciUserManager();
      const updateIdentity = (user: User | null) => {
        const subject = user?.profile.sub;
        setOciIdentity(
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
      userManager.events.addUserUnloaded(() => setOciIdentity(null));
      if (!active) return;
      setManager(userManager);

      const params = new URLSearchParams(window.location.search);
      const providerError = params.get('error');
      if (providerError) {
        throw new Error(params.get('error_description') || providerError);
      }

      let user: User | null;
      let callbackReturnTo: string | null = null;
      const completedAuthCallback = params.has('code') && params.has('state');
      if (completedAuthCallback) {
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
      // Starting a fresh identity-provider round trip also resets the idle clock. A stale
      // timestamp from a previous session must not immediately sign out a newly authenticated
      // user when the callback does not contain a usable returnTo value.
      if (completedAuthCallback && user && !user.expired && typeof user.profile.sub === 'string') {
        resetIdleTracking(user.profile.sub);
      }
      updateIdentity(user);
      setOciReady(true);
      if (completedAuthCallback) {
        const returnTo = callbackReturnTo ?? '/dashboard';
        if (returnTo !== window.location.pathname) router.replace(returnTo);
      }
    };

    void initialize().catch((error: unknown) => {
      if (!active) return;
      const initializationError =
        error instanceof Error ? error : new Error('OCI sign-in initialization failed.');
      console.error('OCI sign-in initialization failed.', initializationError);
      setInitializationError(initializationError);
      setOciReady(true);
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
    if (manager) {
      let user = await manager.getUser();
      if (user && !user.expired) return user.access_token;
      if (user?.expired) {
        try {
          user = await manager.signinSilent();
          if (user && !user.expired) return user.access_token;
        } catch (error) {
          console.warn('OCI session refresh failed; checking the Google session.', error);
          await manager.removeUser();
        }
      }
    }

    const {
      data: { session: currentSession },
      error,
    } = await auth.getSession();
    if (error) throw error;
    return currentSession?.access_token ?? null;
  }, [auth, manager]);

  const signOut = useCallback(async () => {
    if (ociIdentity) {
      if (!manager) throw new Error('OCI sign-in is not initialized.');
      const { error } = await auth.signOut();
      if (error) throw error;
      await manager.signoutRedirect({ post_logout_redirect_uri: window.location.origin });
      return;
    }
    const { error } = await auth.signOut();
    if (error) throw error;
  }, [auth, manager, ociIdentity]);

  const startGoogleAuth = useCallback(
    async (options?: { returnTo?: string }) => {
      if (manager) {
        await manager.removeUser();
        setOciIdentity(null);
      }
      await startSupabaseGoogleAuth(supabase, options?.returnTo);
    },
    [manager, supabase],
  );

  const prepareForSupabaseAuth = useCallback(async () => {
    if (manager) {
      await manager.removeUser();
      setOciIdentity(null);
    }
    markSupabaseAuthPending();
  }, [manager]);

  const startAuth = useCallback(
    async (mode: 'login' | 'signup', options?: { email?: string; returnTo?: string }) => {
      if (initializationError) throw initializationError;
      if (!manager) throw new Error('OCI sign-in is not initialized.');
      const { error } = await auth.signOut();
      if (error) throw error;
      await manager.signinRedirect({
        state: { returnTo: getSafeReturnTo(options?.returnTo) },
        extraQueryParams: options?.email ? { login_hint: options.email } : undefined,
        prompt: mode === 'login' ? 'login' : undefined,
      });
    },
    [auth, initializationError, manager],
  );

  useIdleSignOut(isReady, identity?.sub ?? null, signOut);

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      isSignedIn: Boolean(identity),
      userId: identity?.sub ?? null,
      getToken,
      signOut,
      prepareForSupabaseAuth,
      startGoogleAuth,
      startAuth,
      profile: {
        fullName: identity?.name ?? '',
        email: identity?.email ?? '',
        avatarUrl: identity?.picture,
      },
    }),
    [
      getToken,
      identity,
      isReady,
      prepareForSupabaseAuth,
      signOut,
      startAuth,
      startGoogleAuth,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
