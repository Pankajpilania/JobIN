'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { User, UpdateProfilePayload } from '@/types';
import { useAuth } from '@/hooks/use-auth';

export function useCurrentUser() {
  const { getToken, isReady, isSignedIn, userId } = useAuth();

  return useQuery<User>({
    queryKey: ['user', 'me', userId],
    enabled: isReady && isSignedIn,
    queryFn: async () => {
      const token = await getToken();
      return apiClient.get<User>('/users/me', token ?? undefined);
    },
  });
}

export function useUpdateProfile() {
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const token = await getToken();
      return apiClient.patch<User>('/users/me', payload, token ?? undefined);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['user', 'me', userId], updated);
    },
  });
}
