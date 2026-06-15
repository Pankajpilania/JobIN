// Admin API client — all calls to /api/admin/*
// Uses getToken from Clerk to always have fresh JWT

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

async function getHeaders(): Promise<Record<string, string>> {
  // In Next.js app router, use Clerk's getToken() from the component
  // This module exports a factory so callers can pass the token
  return { 'Content-Type': 'application/json' };
}

async function request<T>(
  path:    string,
  token:   string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API}/admin${path}`, {
    ...options,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers as Record<string, string> ?? {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(Array.isArray(err.message) ? err.message.join(', ') : (err.message ?? 'API error'));
  }
  return res.status === 204 ? (null as T) : res.json();
}

// ─── Metrics ──────────────────────────────────────────────────────────────────
export const getMetrics      = (token: string) => request<any>('/metrics', token);

// ─── Users ────────────────────────────────────────────────────────────────────
export const listUsers       = (token: string, params?: Record<string, any>) =>
  request<any>(`/users?${new URLSearchParams(params).toString()}`, token);
export const getUserActivity = (token: string, id: string) =>
  request<any>(`/users/${id}/activity`, token);
export const updateUser      = (token: string, id: string, data: any) =>
  request<any>(`/users/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });

// ─── Subscriptions ────────────────────────────────────────────────────────────
export const listSubscriptions = (token: string, params?: Record<string, any>) =>
  request<any>(`/subscriptions?${new URLSearchParams(params).toString()}`, token);

// ─── Billing ──────────────────────────────────────────────────────────────────
export const getBilling = (token: string) => request<any>('/billing', token);

// ─── AI usage ─────────────────────────────────────────────────────────────────
export const getAIUsage = (token: string) => request<any>('/ai-usage', token);

// ─── Tickets ──────────────────────────────────────────────────────────────────
export const listTickets  = (token: string, params?: Record<string, any>) =>
  request<any>(`/tickets?${new URLSearchParams(params).toString()}`, token);
export const updateTicket = (token: string, id: string, data: any) =>
  request<any>(`/tickets/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) });
export const replyToTicket = (token: string, id: string, content: string) =>
  request<any>(`/tickets/${id}/reply`, token, { method: 'POST', body: JSON.stringify({ content }) });

// ─── Notifications ────────────────────────────────────────────────────────────
export const sendNotification = (token: string, data: any) =>
  request<any>('/notifications/send', token, { method: 'POST', body: JSON.stringify(data) });
