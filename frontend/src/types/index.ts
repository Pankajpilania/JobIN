// ─── Enums ──────────────────────────────────────────────────────────────────

export type ApplicationStatus =
  | "SAVED"
  | "APPLIED"
  | "PHONE_SCREEN"
  | "INTERVIEW"
  | "TECHNICAL_ASSESSMENT"
  | "FINAL_ROUND"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN";

export type AccountStatus = "ACTIVE" | "SUSPENDED" | "DELETED";
export type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELLED" | "PAST_DUE";

// ─── Core Entities ───────────────────────────────────────────────────────────

export interface User {
  id: string;
  clerkId?: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  country?: string;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Resume {
  id: string;
  userId: string;
  title: string;
  s3Key: string;
  s3Url: string;
  fileSize: number;
  mimeType: string;
  atsScore: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobApplication {
  id: string;
  userId: string;
  jobTitle: string;
  companyName: string;
  location?: string;
  status: ApplicationStatus;
  appliedDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  resume?: Pick<Resume, "id" | "title">;
}

export interface AICredits {
  id: string;
  userId: string;
  remaining: number;
  updatedAt: string;
}

export interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
}

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  plan: Plan;
}

// ─── API Response Wrappers ───────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export interface DashboardStats {
  applicationsThisWeek: number;
  totalApplications: number;
  interviewRate: number;
  resumeHealthScore: number;
  aiCreditsRemaining: number;
  activeInterviews: number;
}
