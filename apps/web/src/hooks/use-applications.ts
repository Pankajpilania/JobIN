'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import type {
  JobApplication, ApplicationStats, ActivityItem,
  CreateApplicationPayload, ApplicationStatus,
} from '@/types';

// ─── List applications ────────────────────────────────────────────────────────

export function useApplications(status?: ApplicationStatus) {
  const { getToken, isSignedIn } = useAuth();
  return useQuery<JobApplication[]>({
    queryKey: ['applications', status],
    enabled:  !!isSignedIn,
    queryFn:  async () => {
      const token = await getToken();
      const qs    = status ? `?status=${status}` : '';
      return apiClient.get<JobApplication[]>(`/applications${qs}`, token ?? undefined);
    },
  });
}

// ─── All applications (unfiltered, for Kanban) ────────────────────────────────

export function useAllApplications() {
  return useApplications(undefined);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function useApplicationStats() {
  const { getToken, isSignedIn } = useAuth();
  return useQuery<ApplicationStats>({
    queryKey: ['application-stats'],
    enabled:  !!isSignedIn,
    queryFn:  async () => {
      const token = await getToken();
      return apiClient.get<ApplicationStats>('/applications/stats', token ?? undefined);
    },
    staleTime: 30_000,
  });
}

// ─── Activity feed ────────────────────────────────────────────────────────────

export function useActivityFeed() {
  const { getToken, isSignedIn } = useAuth();
  return useQuery<ActivityItem[]>({
    queryKey: ['activity-feed'],
    enabled:  !!isSignedIn,
    queryFn:  async () => {
      const token = await getToken();
      return apiClient.get<ActivityItem[]>('/applications/activity', token ?? undefined);
    },
    staleTime: 20_000,
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────

export function useCreateApplication() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateApplicationPayload) => {
      const token = await getToken();
      return apiClient.post<JobApplication>('/applications', payload, token ?? undefined);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['application-stats'] });
      qc.invalidateQueries({ queryKey: ['activity-feed'] });
    },
  });
}

// ─── Update (status change, notes, dates) ────────────────────────────────────

export function useUpdateApplication() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CreateApplicationPayload> & { id: string }) => {
      const token = await getToken();
      return apiClient.patch<JobApplication>(`/applications/${id}`, patch, token ?? undefined);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['application-stats'] });
      qc.invalidateQueries({ queryKey: ['activity-feed'] });
    },
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export function useDeleteApplication() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiClient.delete(`/applications/${id}`, token ?? undefined);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['application-stats'] });
      qc.invalidateQueries({ queryKey: ['activity-feed'] });
    },
  });
}
