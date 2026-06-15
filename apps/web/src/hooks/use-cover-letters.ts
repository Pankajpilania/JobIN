'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import type { CoverLetter, CoverLetterListItem, CoverLetterVariant } from '@/types';

interface GeneratePayload {
  resumeId:          string;
  jobTitle:          string;
  companyName:       string;
  jobDescription:    string;
  variant:           CoverLetterVariant;
  hiringManagerName?: string;
}

export function useCoverLetters() {
  const { getToken, isSignedIn } = useAuth();
  return useQuery<CoverLetterListItem[]>({
    queryKey: ['cover-letters'],
    enabled:  !!isSignedIn,
    queryFn:  async () => {
      const token = await getToken();
      return apiClient.get<CoverLetterListItem[]>('/cover-letters', token ?? undefined);
    },
  });
}

export function useCoverLetter(id: string | null) {
  const { getToken } = useAuth();
  return useQuery<CoverLetter>({
    queryKey: ['cover-letters', id],
    enabled:  !!id,
    queryFn:  async () => {
      const token = await getToken();
      return apiClient.get<CoverLetter>(`/cover-letters/${id}`, token ?? undefined);
    },
  });
}

export function useGenerateCoverLetter() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: GeneratePayload) => {
      const token = await getToken();
      return apiClient.post<CoverLetter>('/cover-letters/generate', payload, token ?? undefined);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cover-letters'] }),
  });
}

export function useDeleteCoverLetter() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiClient.delete(`/cover-letters/${id}`, token ?? undefined);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cover-letters'] }),
  });
}
