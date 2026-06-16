import type { ApiError } from '@/types';

// NEXT_PUBLIC_API_URL already contains the full base e.g. "http://localhost:4000/api"
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

class HttpError extends Error {
  statusCode: number;
  constructor(error: ApiError) {
    super(Array.isArray(error.message) ? error.message.join(', ') : error.message);
    this.statusCode = error.statusCode;
    this.name = 'HttpError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...init } = options;

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };

  // Don't set Content-Type for FormData — browser does it with boundary
  if (!(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: 'no-store' });
  } catch (fetchErr: any) {
    throw new Error(
      `Network request failed to ${API_BASE}${path}.\n` +
      `Please ensure NEXT_PUBLIC_API_URL is configured correctly in production environment variables (e.g. pointing to your Render backend HTTPS URL instead of localhost) and CORS is configured on the backend. Details: ${fetchErr.message}`
    );
  }

  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({
      statusCode: res.status,
      message: res.statusText || 'Request failed',
      timestamp: new Date().toISOString(),
      path,
    }));
    throw new HttpError(err);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const apiClient = {
  get: <T>(path: string, token?: string) =>
    request<T>(path, { method: 'GET', token }),

  post: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      token,
    }),

  patch: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
      token,
    }),

  delete: <T>(path: string, token?: string) =>
    request<T>(path, { method: 'DELETE', token }),
};

export { HttpError };
