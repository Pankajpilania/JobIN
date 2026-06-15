import type { AuthState, ExtensionSettings, DetectedJob, Resume, UserProfile, DEFAULT_SETTINGS } from './types';

// ─── Type-safe storage keys ───────────────────────────────────────────────────

const KEYS = {
  AUTH:     'jobin_auth',
  SETTINGS: 'jobin_settings',
  PROFILE:  'jobin_profile',
  RESUMES:  'jobin_resumes_cache',
  JOB:      'jobin_detected_job',  // current detected job (session)
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

export async function getAuth(): Promise<AuthState | null> {
  const auth = await get<AuthState>(KEYS.AUTH);
  if (!auth) return null;
  // Check token expiry (allow 60s buffer)
  if (auth.expiresAt && Date.now() > auth.expiresAt - 60_000) {
    await clearAuth();
    return null;
  }
  return auth;
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
  // Merge with defaults so new settings keys always have a value
  const defaults: ExtensionSettings = {
    apiUrl: import.meta.env?.VITE_API_URL ?? 'http://localhost:4000/api',
    showBadge: true,
    openSidePanelOnDetect: true,
    autofill: {
      enabled: true, fillName: true, fillEmail: true, fillPhone: true,
      fillWorkHistory: true, fillEducation: true, fillVisaSponsorship: false,
      workAuthorisation: 'yes',
    },
  };
  return stored ? { ...defaults, ...stored, autofill: { ...defaults.autofill, ...stored.autofill } } : defaults;
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
  const key    = `${KEYS.JOB}_${tabId}`;
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
