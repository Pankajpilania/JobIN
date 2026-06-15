// ─── Auth ────────────────────────────────────────────────────────────────────
export type AccountStatus    = 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PAST_DUE';
export type CoverLetterVariant = 'STANDARD' | 'CONCISE' | 'DETAILED' | 'HIRING_MANAGER';
export type ApplicationStatus =
  | 'SAVED' | 'APPLIED' | 'PHONE_SCREEN' | 'INTERVIEW'
  | 'TECHNICAL_ASSESSMENT' | 'FINAL_ROUND' | 'OFFER' | 'REJECTED' | 'WITHDRAWN';

export interface Role { id: string; name: string; description?: string }
export interface UserRole { userId: string; roleId: string; role: Role; grantedAt: string }
export interface Plan { id: string; name: string; priceMonthly: number; priceYearly: number; currency: string }
export interface Subscription { id: string; status: SubscriptionStatus; currentPeriodEnd: string; cancelAtPeriodEnd: boolean; plan: Plan }
export interface User {
  id: string; clerkId?: string; email: string; fullName: string;
  avatarUrl?: string; country?: string; status: AccountStatus;
  createdAt: string; updatedAt: string; lastLoginAt?: string;
  roles: UserRole[]; subscriptions: Subscription[];
}

// ─── Resumes ─────────────────────────────────────────────────────────────────

export interface ATSAnalysis {
  healthScore: number; grade: 'A' | 'B' | 'C' | 'D' | 'F'; summary: string;
  formattingIssues: string[]; keywordSuggestions: string[];
  missingSections: string[]; strengths: string[]; improvements: string[];
}

export interface Resume {
  id: string; userId: string; title: string; originalName: string;
  s3Url: string; fileSize: number; mimeType: string; atsScore: number;
  isDefault: boolean; analysisResult: ATSAnalysis | null;
  createdAt: string; updatedAt: string; downloadUrl?: string;
}

export interface AnalyseResult {
  resumeId: string; atsScore: number; analysis: ATSAnalysis;
  tokenUsage: { total: number; estimatedCostUsd: number };
}

// ─── Resume Tailor (Sprint 3) ─────────────────────────────────────────────────

export interface TailorResult {
  versionId: string; versionNum: number; tailoredText: string;
  missingKeywords: string[]; keywordDensity: Record<string, number>;
  scoreBefore: number; scoreAfter: number; changesApplied: string[];
  tokenUsage: { total: number; estimatedCostUsd: number };
}

export interface ResumeVersion {
  id: string; versionNum: number; scoreBefore: number; scoreAfter: number;
  jobTitle?: string; companyName?: string; changesApplied: string[];
  keywordDensity: Record<string, number>; createdAt: string;
}

// ─── Cover Letters (Sprint 3) ──────────────────────────────────────────────────

export interface CoverLetter {
  id: string; userId: string; resumeId?: string;
  jobTitle: string; companyName: string; hiringManagerName?: string;
  variant: CoverLetterVariant; content: string; wordCount: number;
  createdAt: string; updatedAt: string;
}

export interface CoverLetterListItem {
  id: string; jobTitle: string; companyName: string;
  variant: CoverLetterVariant; wordCount: number;
  hiringManagerName?: string; createdAt: string; updatedAt: string;
}

// ─── Job Tracker (Sprint 4) ───────────────────────────────────────────────────

export interface Company {
  id: string; name: string; website?: string; logoUrl?: string; industry?: string;
}

export interface JobApplication {
  id: string; userId: string; companyId?: string; company?: Company;
  jobTitle: string; companyName: string; location?: string; jobUrl?: string;
  jobDescription?: string; salary?: string; status: ApplicationStatus;
  appliedDate?: string; followUpDate?: string; notes?: string;
  source?: string; resumeId?: string; coverLetterId?: string;
  createdAt: string; updatedAt: string;
}

export interface ApplicationStats {
  total: number; totalApplied: number;
  byStatus: Record<ApplicationStatus, number>;
  interviewRate: number; offerRate: number; thisWeek: number;
}

export interface ActivityItem {
  id: string; jobTitle: string; companyName: string;
  status: ApplicationStatus; updatedAt: string; appliedDate?: string; location?: string;
}

export interface CreateApplicationPayload {
  jobTitle: string; companyName: string; location?: string; jobUrl?: string;
  salary?: string; status?: ApplicationStatus; appliedDate?: string;
  followUpDate?: string; notes?: string; source?: string;
  resumeId?: string; coverLetterId?: string; jobDescription?: string;
}

// ─── API helpers ─────────────────────────────────────────────────────────────
export interface ApiError { statusCode: number; message: string | string[]; timestamp: string; path: string }
export interface UpdateProfilePayload { fullName?: string; country?: string; avatarUrl?: string }
