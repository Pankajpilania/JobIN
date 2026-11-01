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

export async function getAuth(): Promise<AuthState | null> {
  const auth = await get<AuthState>(KEYS.AUTH);
  if (!auth) return null;
  if (!auth.expiresAt || Date.now() <= auth.expiresAt - 60_000) return auth;
  if (
    import.meta.env.VITE_AUTH_PROVIDER !== 'oci' ||
    !auth.refreshToken ||
    !auth.tokenEndpoint
  ) {
    await clearAuth();
    return null;
  }

  if (!refreshInProgress) {
    refreshInProgress = refreshOciAuth(auth).finally(() => {
      refreshInProgress = null;
    });
  }
  return refreshInProgress;
}

async function refreshOciAuth(auth: AuthState): Promise<AuthState | null> {
  const clientId = import.meta.env.VITE_OCI_CLIENT_ID?.trim();
  if (!clientId) throw new Error('OCI extension client is not configured.');

  let response: Response;
  try {
    response = await fetch(auth.tokenEndpoint!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: auth.refreshToken!,
      }),
    });
  } catch {
    throw new Error('Could not refresh your JobIN session. Check your connection and try again.');
  }

  if (response.status === 400 || response.status === 401) {
    await clearAuth();
    return null;
  }
  if (!response.ok) {
    throw new Error(`Could not refresh your JobIN session (${response.status}).`);
  }

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object') {
    throw new Error('OCI returned an invalid session refresh response.');
  }
  const values = payload as Record<string, unknown>;
  if (
    typeof values.access_token !== 'string' ||
    !values.access_token ||
    typeof values.expires_in !== 'number' ||
    !Number.isFinite(values.expires_in) ||
    values.expires_in <= 0
  ) {
    throw new Error('OCI returned an invalid session refresh response.');
  }

  const refreshedAuth: AuthState = {
    ...auth,
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
