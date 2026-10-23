'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import type { DashboardSummary } from '@/types';

export function useDashboardSummary() {
  const { getToken, isReady, isSignedIn, userId } = useAuth();

  return useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary', userId],
    enabled: isReady && isSignedIn,
    staleTime: 60_000,
    retry: 1,
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Your session has expired. Please sign in again.');
      return apiClient.get<DashboardSummary>('/dashboard/summary', token);
    },
  });
}
