import { getToken, getSettings } from './storage';
import type { Resume, TailorResult, CoverLetterResult, CoverLetterVariant } from './types';

// ─── Supabase Configuration ──────────────────────────────────────────────────
const SUPABASE_URL = 'https://duccxvuwdoqqgaowplrs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Y2N4dnV3ZG9xcWdhb3dwbHJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzODMzMDMsImV4cCI6MjA5Njk1OTMwM30.x651PDjYrsYkxMZRMWmsq5Pq7YAN8_YjOEwyl1Dx8Xk';

async function getBaseUrl(): Promise<string> {
  const settings = await getSettings();
  return settings?.apiUrl || 'http://localhost:4000/api';
}

export async function signInWithEmail(email: string, password: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error_description: res.statusText }));
    throw new Error(body.error_description || body.message || 'Login failed');
  }
  return res.json();
}

export async function signUpWithEmail(email: string, password: string, fullName: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error_description: res.statusText }));
    throw new Error(body.error_description || body.message || 'Sign up failed');
  }
  return res.json();
}

class ApiError extends Error {
  statusCode: number;
  constructor(status: number, message: string) {
    super(message);
    this.statusCode = status;
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const base  = await getBaseUrl();
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${base}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, Array.isArray(body.message) ? body.message.join(', ') : body.message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Resume endpoints ─────────────────────────────────────────────────────────

export async function listResumes(): Promise<Resume[]> {
  return request<Resume[]>('/resumes');
}

// ─── Resume tailor ────────────────────────────────────────────────────────────

export async function tailorResume(
  resumeId: string,
  jobDescription: string,
  jobTitle?: string,
  companyName?: string,
): Promise<TailorResult> {
  return request<TailorResult>(`/resumes/${resumeId}/tailor`, {
    method: 'POST',
    body:   JSON.stringify({ jobDescription, jobTitle, companyName }),
  });
}

// ─── Cover letter generation ──────────────────────────────────────────────────

export async function generateCoverLetter(params: {
  resumeId:          string;
  jobTitle:          string;
  companyName:       string;
  jobDescription:    string;
  variant:           CoverLetterVariant;
  hiringManagerName?: string;
}): Promise<CoverLetterResult> {
  return request<CoverLetterResult>('/cover-letters/generate', {
    method: 'POST',
    body:   JSON.stringify(params),
  });
}

// ─── Job application tracker ──────────────────────────────────────────────────

export async function saveApplication(data: {
  jobTitle:       string;
  companyName:    string;
  location?:      string;
  jobUrl?:        string;
  status?:        string;
  jobDescription?: string;
  source?:        string;
}): Promise<{ id: string }> {
  return request<{ id: string }>('/applications', {
    method: 'POST',
    body:   JSON.stringify({ ...data, source: data.source ?? 'Extension' }),
  });
}

// ─── User profile ─────────────────────────────────────────────────────────────

export async function getUserProfile(): Promise<{
  id: string; email: string; fullName: string; avatarUrl?: string; country?: string;
}> {
  return request('/users/me');
}

// ─── Validate token ───────────────────────────────────────────────────────────

export async function validateToken(): Promise<boolean> {
  try {
    await getUserProfile();
    return true;
  } catch {
    return false;
  }
}

export { ApiError };
