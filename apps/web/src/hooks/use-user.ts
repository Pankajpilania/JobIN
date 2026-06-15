'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { apiClient } from '@/lib/api-client';
import type { User, UpdateProfilePayload } from '@/types';
import { useEffect, useState } from 'react';

const supabase = createClient();

export function useCurrentUser() {
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsSignedIn(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return useQuery<User>({
    queryKey: ['user', 'me'],
    enabled: isSignedIn === true,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      return apiClient.get<User>('/users/me', token ?? undefined);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      return apiClient.patch<User>('/users/me', payload, token ?? undefined);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['user', 'me'], updated);
    },
  });
}
