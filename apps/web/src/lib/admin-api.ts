// Admin API client — all calls to /api/admin/*
// Uses getToken from Clerk to always have fresh JWT

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://jobin-tmvb.onrender.com/api';

type QueryParams = Record<string, string | number | boolean | null | undefined>;

function queryString(params?: QueryParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

async function _getHeaders(): Promise<Record<string, string>> {
  // In Next.js app router, use Clerk's getToken() from the component
  // This module exports a factory so callers can pass the token
  return { 'Content-Type': 'application/json' };
}

async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  let res;
  try {
    res = await fetch(`${API}/admin${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...((options.headers as Record<string, string>) ?? {}),
      },
    });
  } catch (fetchErr: any) {
    throw new Error(
      `Network request failed to ${API}/admin${path}.\n` +
        `Please ensure NEXT_PUBLIC_API_URL is configured correctly in production environment variables (e.g. pointing to your Render backend HTTPS URL instead of localhost) and CORS is configured on the backend. Details: ${fetchErr.message}`,
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(
      Array.isArray(err.message) ? err.message.join(', ') : (err.message ?? 'API error'),
    );
  }
  return res.status === 204 ? (null as T) : res.json();
}

// ─── Metrics ──────────────────────────────────────────────────────────────────
export const getMetrics = (token: string) => request<any>('/metrics', token);

// ─── Users ────────────────────────────────────────────────────────────────────
export const listUsers = (token: string, params?: QueryParams) =>
  request<any>(`/users${queryString(params)}`, token);
export const getUserActivity = (token: string, id: string) =>
  request<any>(`/users/${id}/activity`, token);
export const updateUser = (token: string, id: string, data: any) =>
  request<any>(`/users/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteUser = (token: string, id: string) =>
  request<{ deleted: boolean }>(`/users/${id}`, token, { method: 'DELETE' });

// ─── Subscriptions ────────────────────────────────────────────────────────────
export const listSubscriptions = (token: string, params?: QueryParams) =>
  request<any>(`/subscriptions${queryString(params)}`, token);

// ─── Billing ──────────────────────────────────────────────────────────────────
export const getBilling = (token: string) => request<any>('/billing', token);

// ─── AI usage ─────────────────────────────────────────────────────────────────
export const getAIUsage = (token: string) => request<any>('/ai-usage', token);

// ─── Tickets ──────────────────────────────────────────────────────────────────
export const listTickets = (token: string, params?: QueryParams) =>
  request<any>(`/tickets${queryString(params)}`, token);
export const updateTicket = (token: string, id: string, data: any) =>
  request<any>(`/tickets/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
export const replyToTicket = (token: string, id: string, content: string) =>
  request<any>(`/tickets/${id}/reply`, token, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

// ─── Notifications ────────────────────────────────────────────────────────────
export const sendNotification = (token: string, data: any) =>
  request<any>('/notifications/send', token, { method: 'POST', body: JSON.stringify(data) });
