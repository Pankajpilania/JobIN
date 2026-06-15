"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { apiClient } from "@/lib/api-client";
import type { JobApplication, ApplicationStatus } from "@/types";

export function useApplications(status?: ApplicationStatus) {
  const { getToken } = useAuth();

  return useQuery<JobApplication[]>({
    queryKey: ["applications", status],
    queryFn: async () => {
      const token = await getToken();
      const path = status ? `/applications?status=${status}` : "/applications";
      return apiClient.get<JobApplication[]>(path, token ?? undefined);
    },
  });
}

export function useCreateApplication() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      jobTitle: string;
      companyName: string;
      location?: string;
      status?: ApplicationStatus;
      notes?: string;
    }) => {
      const token = await getToken();
      return apiClient.post<JobApplication>("/applications", data, token ?? undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}

export function useUpdateApplication() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{
        status: ApplicationStatus;
        notes: string;
        appliedDate: string;
      }>;
    }) => {
      const token = await getToken();
      return apiClient.patch<JobApplication>(`/applications/${id}`, data, token ?? undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}

export function useDeleteApplication() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return apiClient.delete(`/applications/${id}`, token ?? undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}
