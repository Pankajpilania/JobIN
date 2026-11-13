import { DEFAULT_SETTINGS } from './types';
import type { AuthState, ExtensionSettings, DetectedJob, Resume, UserProfile } from './types';

// ─── Type-safe storage keys ───────────────────────────────────────────────────

const KEYS = {
  AUTH: 'jobin_auth',
  SETTINGS: 'jobin_settings',
  PROFILE: 'jobin_profile',
  RESUMES: 'jobin_resumes_cache',
  JOB: 'jobin_detected_job', // current detected job (session)
} as const;

// ─── Generic storage helpers ──────────────────────────────────────────────────

async function get<T>(key: string): Promise<T | null> {
  const result = await chrome.storage.local.get(key);
  return (result[key] as T) ?? null;
}

async function set(key: string, value: unknown): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

async function remove(key: string): Promise<void> {
  await chrome.storage.local.remove(key);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

let refreshInProgress: Promise<AuthState | null> | null = null;

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://duccxvuwdoqqgaowplrs.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Y2N4dnV3ZG9xcWdhb3dwbHJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzODMzMDMsImV4cCI6MjA5Njk1OTMwM30.x651PDjYrsYkxMZRMWmsq5Pq7YAN8_YjOEwyl1Dx8Xk';
const TOKEN_REFRESH_SAFETY_MS = 60_000;

function isFresh(auth: AuthState) {
  return Number.isFinite(auth.expiresAt) && Date.now() < auth.expiresAt - TOKEN_REFRESH_SAFETY_MS;
}

export async function getAuth(): Promise<AuthState | null> {
  const auth = await get<AuthState>(KEYS.AUTH);
  if (!auth) return null;
  if (isFresh(auth)) return auth;
  return refreshAuth();
}

/** Refresh under a cross-context lock so extension surfaces don't race rotating tokens. */
export async function refreshAuth(rejectedToken?: string): Promise<AuthState | null> {
  if (refreshInProgress) return refreshInProgress;
  const performRefresh = async () => {
    const latest = await get<AuthState>(KEYS.AUTH);
    if (!latest) return null;
    if (rejectedToken && latest.token !== rejectedToken && isFresh(latest)) return latest;
    if (!rejectedToken && isFresh(latest)) return latest;
    return refreshProviderToken(latest);
  };
  const locks = globalThis.navigator?.locks;
  const pending: Promise<AuthState | null> = locks
    ? locks.request('jobin-extension-auth-refresh', performRefresh).then((result) => result)
    : performRefresh();
  refreshInProgress = pending.finally(() => {
    refreshInProgress = null;
  });
  return refreshInProgress;
}

async function clearAuthIfCurrent(auth: AuthState) {
  const latest = await get<AuthState>(KEYS.AUTH);
  if (
    latest?.userId === auth.userId &&
    latest.token === auth.token &&
    latest.refreshToken === auth.refreshToken
  ) {
    await clearAuth();
  }
}

export async function clearAuthForToken(token: string) {
  const latest = await get<AuthState>(KEYS.AUTH);
  if (latest?.token === token) await clearAuth();
}

async function refreshProviderToken(auth: AuthState): Promise<AuthState> {
  const provider = auth.provider ?? (
    import.meta.env.VITE_AUTH_PROVIDER === 'oci'
      ? 'oci'
      : import.meta.env.VITE_AUTH_PROVIDER === 'auth0'
        ? 'auth0'
        : 'supabase'
  );
  const clientId = provider === 'oci'
    ? import.meta.env.VITE_OCI_CLIENT_ID?.trim()
    : provider === 'auth0'
      ? import.meta.env.VITE_AUTH0_CLIENT_ID?.trim()
      : undefined;
  const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN?.trim();
  const endpoint = provider === 'supabase'
    ? new URL('/auth/v1/token', SUPABASE_URL).toString()
    : provider === 'auth0'
      ? auth0Domain
        ? new URL('/oauth/token', `https://${auth0Domain.replace(/^https?:\/\//i, '').replace(/\/+$/, '')}`).toString()
        : ''
      : auth.tokenEndpoint ?? '';

  if (!auth.refreshToken || !endpoint || (provider !== 'supabase' && !clientId)) {
    await clearAuthIfCurrent(auth);
    throw new Error('Your extension session expired or was revoked. Sign in again in JobIN extension settings.');
  }
  let endpointUrl: URL;
  try {
    endpointUrl = new URL(endpoint);
  } catch {
    await clearAuthIfCurrent(auth);
    throw new Error('Your extension session settings are invalid. Sign in again in JobIN extension settings.');
  }
  if (
    (endpointUrl.protocol !== 'https:' && endpointUrl.hostname !== 'localhost') ||
    endpointUrl.username || endpointUrl.password
  ) {
    await clearAuthIfCurrent(auth);
    throw new Error('Your extension session settings are invalid. Sign in again in JobIN extension settings.');
  }

  let response: Response;
  try {
    if (provider === 'supabase') {
      endpointUrl.searchParams.set('grant_type', 'refresh_token');
      response = await fetch(endpointUrl.toString(), {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: auth.refreshToken }),
      });
    } else {
      response = await fetch(endpointUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId!,
          refresh_token: auth.refreshToken,
        }),
      });
    }
  } catch {
    throw new Error('Could not refresh your JobIN session. Check your connection and try again. Your saved sign-in is still available.');
  }

  if (response.status === 400 || response.status === 401) {
    await clearAuthIfCurrent(auth);
    throw new Error('Your extension session expired or was revoked. Sign in again in JobIN extension settings.');
  }
  if (!response.ok) {
    throw new Error(`Could not refresh your JobIN session (${response.status}). Your saved sign-in is still available; try again shortly.`);
  }
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object') {
    throw new Error(`${provider.toUpperCase()} returned an invalid session refresh response. Your saved sign-in is still available.`);
  }
  const values = payload as Record<string, unknown>;
  if (
    typeof values.access_token !== 'string' ||
    !values.access_token ||
    typeof values.expires_in !== 'number' ||
    !Number.isFinite(values.expires_in) ||
    values.expires_in <= 0
  ) {
    throw new Error(`${provider.toUpperCase()} returned an invalid access token response. Your saved sign-in is still available.`);
  }

  const refreshedAuth: AuthState = {
    ...auth,
    provider,
    token: values.access_token,
    refreshToken:
      typeof values.refresh_token === 'string' && values.refresh_token
        ? values.refresh_token
        : auth.refreshToken,
    expiresAt: Date.now() + values.expires_in * 1000,
  };
  await setAuth(refreshedAuth);
  return refreshedAuth;
}

export async function setAuth(auth: AuthState): Promise<void> {
  await set(KEYS.AUTH, auth);
}

export async function clearAuth(): Promise<void> {
  await remove(KEYS.AUTH);
}

export async function getToken(): Promise<string | null> {
  const auth = await getAuth();
  return auth?.token ?? null;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await get<ExtensionSettings>(KEYS.SETTINGS);
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    apiUrl:
      import.meta.env.MODE === 'production'
        ? DEFAULT_SETTINGS.apiUrl
        : (stored?.apiUrl ?? DEFAULT_SETTINGS.apiUrl),
    autofill: { ...DEFAULT_SETTINGS.autofill, ...stored?.autofill },
  };
}

export async function setSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  const current = await getSettings();
  await set(KEYS.SETTINGS, { ...current, ...settings });
}

// ─── User profile (for autofill) ──────────────────────────────────────────────

export async function getUserProfile(): Promise<UserProfile | null> {
  return get<UserProfile>(KEYS.PROFILE);
}

export async function setUserProfile(profile: UserProfile): Promise<void> {
  await set(KEYS.PROFILE, profile);
}

// ─── Resume cache ─────────────────────────────────────────────────────────────

export async function getCachedResumes(): Promise<Resume[] | null> {
  return get<Resume[]>(KEYS.RESUMES);
}

export async function setCachedResumes(resumes: Resume[]): Promise<void> {
  await set(KEYS.RESUMES, resumes);
}

// ─── Detected job (current tab) ───────────────────────────────────────────────

/** Store detected job per tab in session storage */
export async function setDetectedJob(tabId: number, job: DetectedJob): Promise<void> {
  const key = `${KEYS.JOB}_${tabId}`;
  await chrome.storage.session.set({ [key]: job });
}

export async function getDetectedJob(tabId: number): Promise<DetectedJob | null> {
  const key = `${KEYS.JOB}_${tabId}`;
  const result = await chrome.storage.session.get(key);
  return (result[key] as DetectedJob) ?? null;
}

export async function clearDetectedJob(tabId: number): Promise<void> {
  const key = `${KEYS.JOB}_${tabId}`;
  await chrome.storage.session.remove(key);
}

// ─── Default resume ID ────────────────────────────────────────────────────────

export async function getDefaultResumeId(): Promise<string | null> {
  const settings = await getSettings();
  return settings.defaultResumeId ?? null;
}

export async function setDefaultResumeId(id: string): Promise<void> {
  await setSettings({ defaultResumeId: id });
}
