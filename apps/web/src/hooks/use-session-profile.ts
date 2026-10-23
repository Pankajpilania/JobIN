'use client';

import { useAuth } from '@/hooks/use-auth';

export function useSessionProfile() {
  return useAuth().profile;
}
