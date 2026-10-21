'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SessionProfile {
  fullName: string;
  email: string;
  avatarUrl?: string;
}

const supabase = createClient();

function getSessionProfile(user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']): SessionProfile {
  const metadata = user?.user_metadata;
  return {
    fullName: metadata?.full_name ?? metadata?.name ?? '',
    email: user?.email ?? '',
    avatarUrl: metadata?.avatar_url ?? metadata?.picture,
  };
}

export function useSessionProfile() {
  const [profile, setProfile] = useState<SessionProfile>({
    fullName: '',
    email: '',
  });

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.error('Unable to load Supabase session profile', error);
        return;
      }
      if (active) setProfile(getSessionProfile(data.user));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setProfile(getSessionProfile(session?.user ?? null));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return profile;
}
