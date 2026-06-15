// ─── Job detection & extraction ───────────────────────────────────────────────

export type JobBoard =
  | 'linkedin' | 'indeed' | 'reed' | 'totaljobs'
  | 'glassdoor' | 'greenhouse' | 'lever' | 'workday' | 'unknown';

export interface DetectedJob {
  board:          JobBoard;
  url:            string;
  jobTitle:       string;
  companyName:    string;
  location:       string;
  salary:         string;
  jobDescription: string;
  extractedAt:    number; // timestamp
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthState {
  token:      string;       // Clerk JWT or API token
  userId:     string;
  email:      string;
  fullName:   string;
  avatarUrl?: string;
  expiresAt:  number;       // unix ms — used to detect expired tokens
}

// ─── Resume (mirrors the API model) ──────────────────────────────────────────

export interface Resume {
  id:        string;
  title:     string;
  atsScore:  number;
  isDefault: boolean;
  createdAt: string;
}

// ─── User profile (for autofill) ─────────────────────────────────────────────

export interface UserProfile {
  fullName:   string;
  email:      string;
  phone?:     string;
  location?:  string;
  linkedin?:  string;
  website?:   string;
  workHistory: WorkEntry[];
  education:  EducationEntry[];
}

export interface WorkEntry {
  title:     string;
  company:   string;
  startDate: string;
  endDate:   string;
  current:   boolean;
  bullets:   string[];
}

export interface EducationEntry {
  degree:      string;
  institution: string;
  startDate:   string;
  endDate:     string;
  grade?:      string;
}

// ─── Autofill settings ────────────────────────────────────────────────────────

export interface AutofillSettings {
  enabled:              boolean;
  fillName:             boolean;
  fillEmail:            boolean;
  fillPhone:            boolean;
  fillWorkHistory:      boolean;
  fillEducation:        boolean;
  fillVisaSponsorship:  boolean;
  defaultPhone?:        string;
  workAuthorisation?:   string;  // 'yes' | 'no' | 'visa_required'
}

// ─── Extension settings ───────────────────────────────────────────────────────

export interface ExtensionSettings {
  defaultResumeId?: string;
  apiUrl:           string;
  autofill:         AutofillSettings;
  showBadge:        boolean;
  openSidePanelOnDetect: boolean;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  apiUrl:  import.meta.env?.VITE_API_URL ?? 'http://localhost:4000/api',
  showBadge: true,
  openSidePanelOnDetect: true,
  autofill: {
    enabled:             true,
    fillName:            true,
    fillEmail:           true,
    fillPhone:           true,
    fillWorkHistory:     true,
    fillEducation:       true,
    fillVisaSponsorship: false,
    workAuthorisation:   'yes',
  },
};

// ─── Job match score ─────────────────────────────────────────────────────────

export interface MatchScore {
  score:           number;   // 0-100
  grade:           'A' | 'B' | 'C' | 'D' | 'F';
  matchedKeywords: string[];
  missingKeywords: string[];
  summary:         string;
}

// ─── API responses used by extension ─────────────────────────────────────────

export interface TailorResult {
  versionId:      string;
  tailoredText:   string;
  missingKeywords:string[];
  keywordDensity: Record<string, number>;
  scoreBefore:    number;
  scoreAfter:     number;
  changesApplied: string[];
}

export interface CoverLetterResult {
  id:          string;
  content:     string;
  wordCount:   number;
  variant:     string;
  companyName: string;
  jobTitle:    string;
}

export type CoverLetterVariant = 'STANDARD' | 'CONCISE' | 'DETAILED' | 'HIRING_MANAGER';
