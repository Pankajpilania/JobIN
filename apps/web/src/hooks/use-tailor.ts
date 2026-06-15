'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import type { TailorResult } from '@/types';

interface TailorPayload {
  resumeId:       string;
  jobDescription: string;
  jobTitle?:      string;
  companyName?:   string;
}

export function useTailorResume() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ resumeId, ...body }: TailorPayload) => {
      const token = await getToken();
      return apiClient.post<TailorResult>(`/resumes/${resumeId}/tailor`, body, token ?? undefined);
    },
    onSuccess: (_, { resumeId }) => {
      qc.invalidateQueries({ queryKey: ['resumes', resumeId] });
      qc.invalidateQueries({ queryKey: ['versions', resumeId] });
    },
  });
}
