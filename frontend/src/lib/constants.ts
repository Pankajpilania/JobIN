export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const QUERY_KEYS = {
  resumes: ['resumes'] as const,
  resume: (id: string) => ['resumes', id] as const,
  applications: ['applications'] as const,
  application: (id: string) => ['applications', id] as const,
  user: ['user'] as const,
  credits: ['credits'] as const,
}

export const APPLICATION_STATUSES = [
  { value: 'saved', label: 'Saved', color: 'muted' },
  { value: 'applied', label: 'Applied', color: 'blue' },
  { value: 'phone_screen', label: 'Phone Screen', color: 'indigo' },
  { value: 'interview', label: 'Interview', color: 'indigo' },
  { value: 'offer', label: 'Offer', color: 'success' },
  { value: 'rejected', label: 'Rejected', color: 'destructive' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'muted' },
] as const

export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const PLAN_LIMITS = {
  free: {
    aiTailors: 5,
    applications: 10,
    resumes: 2,
  },
  premium: {
    aiTailors: 50,
    applications: -1, // unlimited
    resumes: 10,
  },
  pro: {
    aiTailors: -1, // unlimited
    applications: -1,
    resumes: -1,
  },
}

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/resumes', label: 'Resumes' },
  { href: '/tracker', label: 'Job Tracker' },
  { href: '/copilot', label: 'AI Copilot' },
  { href: '/interview', label: 'Interview Prep' },
  { href: '/settings', label: 'Settings' },
]
