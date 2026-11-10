'use client'

import { useUser as useClerkUser, useAuth } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { QUERY_KEYS } from '@/lib/constants'
import type { User, DashboardStats } from '@/types'

export function useUser() {
  const { user: clerkUser, isLoaded, isSignedIn } = useClerkUser()
  const { getToken } = useAuth()

  const backendUserQuery = useQuery({
    queryKey: QUERY_KEYS.user,
    queryFn: async () => {
      const token = await getToken()
      const response = await apiClient.get<{ data: User }>('/users/me', token ?? undefined)
      return response.data
    },
    enabled: isSignedIn,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    clerkUser,
    backendUser: backendUserQuery.data,
    isLoading: !isLoaded || backendUserQuery.isLoading,
    isSignedIn,
    error: backendUserQuery.error,
  }
}

export function useDashboardStats() {
  const { getToken } = useAuth()
  const { isSignedIn } = useClerkUser()

  return useQuery({
    queryKey: [...QUERY_KEYS.user, 'stats'],
    queryFn: async () => {
      const token = await getToken()
      const response = await apiClient.get<{ data: DashboardStats }>('/users/stats', token ?? undefined)
      return response.data
    },
    enabled: isSignedIn,
    // Fall back to mock data when API isn't running
    placeholderData: {
      applicationsThisWeek: 12,
      totalApplications: 48,
      interviewRate: 24,
      resumeHealthScore: 87,
      aiCreditsRemaining: 150,
      activeInterviews: 2,
    },
  })
}
