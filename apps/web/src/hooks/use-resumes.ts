'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import type { Resume, AnalyseResult } from '@/types';

// ─── List resumes ─────────────────────────────────────────────────────────────

export function useResumes() {
  const { getToken, isSignedIn } = useAuth();
  return useQuery<Resume[]>({
    queryKey: ['resumes'],
    enabled: !!isSignedIn,
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<Resume[]>('/resumes', token ?? undefined);
    },
  });
}

// ─── Get single resume ────────────────────────────────────────────────────────

export function useResume(id: string | null) {
  const { getToken } = useAuth();
  return useQuery<Resume>({
    queryKey: ['resumes', id],
    enabled: !!id,
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<Resume>(`/resumes/${id}`, token ?? undefined);
    },
  });
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export function useUploadResume() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const token = await getToken();
      const form  = new FormData();
      form.append('resume', file);
      return apiClient.post<Resume>('/resumes/upload', form, token ?? undefined);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resumes'] }),
  });
}

// ─── Analyse ──────────────────────────────────────────────────────────────────

export function useAnalyseResume() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (resumeId: string) => {
      const token = await getToken();
      return apiClient.post<AnalyseResult>(`/resumes/${resumeId}/analyse`, undefined, token ?? undefined);
    },
    onSuccess: (_, resumeId) => {
      qc.invalidateQueries({ queryKey: ['resumes'] });
      qc.invalidateQueries({ queryKey: ['resumes', resumeId] });
    },
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export function useDeleteResume() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (resumeId: string) => {
      const token = await getToken();
      return apiClient.delete(`/resumes/${resumeId}`, token ?? undefined);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resumes'] }),
  });
}

// ─── Set default ─────────────────────────────────────────────────────────────

export function useSetDefaultResume() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (resumeId: string) => {
      const token = await getToken();
      return apiClient.patch(`/resumes/${resumeId}`, { isDefault: true }, token ?? undefined);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resumes'] }),
  });
}
