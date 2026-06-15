"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { apiClient } from "@/lib/api-client";
import type { Resume } from "@/types";

export function useResumes() {
  const { getToken } = useAuth();

  return useQuery<Resume[]>({
    queryKey: ["resumes"],
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<Resume[]>("/resumes", token ?? undefined);
    },
  });
}

export function useDeleteResume() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resumeId: string) => {
      const token = await getToken();
      return apiClient.delete(`/resumes/${resumeId}`, token ?? undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
  });
}

export function useSetDefaultResume() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resumeId: string) => {
      const token = await getToken();
      return apiClient.patch(`/resumes/${resumeId}/set-default`, {}, token ?? undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
  });
}
