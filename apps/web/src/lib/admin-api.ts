// Admin API client — all calls to /api/admin/*
// Uses getToken from Clerk to always have fresh JWT

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.jobin.today/api';

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
        `Please ensure NEXT_PUBLIC_API_URL is configured correctly in production environment variables and CORS is configured on the backend. Details: ${fetchErr.message}`,
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
export const getAdminAccess = (token: string) =>
  request<{ allowed: boolean; roles: string[]; permissions?: string[] }>('/access', token);
export type AdminRolePermissionData = {
  permissions: Array<{ id: string; action: string; description: string | null }>;
  roles: Array<{ id: string; name: string; description: string | null; permissions: string[] }>;
};
export const listAdminRoles = (token: string) => request<AdminRolePermissionData>('/roles', token);
export const updateAdminRolePermissions = (token: string, id: string, permissions: string[]) =>
  request<{ roleId: string; permissions: string[] }>(`/roles/${id}/permissions`, token, {
    method: 'PATCH',
    body: JSON.stringify({ permissions }),
  });

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
export const refundPayment = (token: string, id: string) =>
  request<{ id: string; status: string; amount: number; currency: string }>(
    `/payments/${id}/refund`,
    token,
    { method: 'POST', body: JSON.stringify({}) },
  );

export type SiteBanner = {
  id: string;
  title: string;
  message: string;
  linkText: string | null;
  linkUrl: string | null;
  variant: 'INFO' | 'PROMO' | 'WARNING';
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type SiteBannerInput = Omit<SiteBanner, 'id' | 'createdAt' | 'updatedAt'>;
export const listSiteBanners = (token: string) => request<SiteBanner[]>('/content/banners', token);
export const createSiteBanner = (token: string, data: SiteBannerInput) =>
  request<SiteBanner>('/content/banners', token, { method: 'POST', body: JSON.stringify(data) });
export const updateSiteBanner = (token: string, id: string, data: Partial<SiteBannerInput>) =>
  request<SiteBanner>(`/content/banners/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
export const deactivateSiteBanner = (token: string, id: string) =>
  request<SiteBanner>(`/content/banners/${id}`, token, { method: 'DELETE' });

export type AdminReport = 'users' | 'billing' | 'subscriptions' | 'ai-usage';
export async function downloadAdminReport(token: string, report: AdminReport) {
  const response = await fetch(`${API}/admin/reports/${report}.csv`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message ?? 'Could not export this report.');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `jobin-${report}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

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
