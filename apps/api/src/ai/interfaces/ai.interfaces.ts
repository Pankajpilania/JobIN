/** Structured result returned by the Gemini ATS analyser */
export interface ATSAnalysisResult {
  healthScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
  formattingIssues: string[];
  keywordSuggestions: string[];
  missingSections: string[];
  strengths: string[];
  improvements: string[];
}

/** Result of the AI resume tailoring operation (Sprint 3) */
export type RequirementCategory =
  | 'mandatory_skill'
  | 'desirable_skill'
  | 'responsibility'
  | 'domain_knowledge'
  | 'experience_expectation';

export type EvidenceStatus = 'demonstrated' | 'transferable' | 'missing';

export interface ResumeProfile {
  name: string | null;
  emails: string[];
  phones: string[];
  urls: string[];
  summary: string | null;
  skills: { demonstrated: string[]; transferable: string[] };
  experience: Array<{
    employer: string;
    role: string;
    location: string | null;
    dates: string | null;
    evidence: string[];
  }>;
  education: string[];
  certifications: string[];
  projects: Array<{ name: string; evidence: string[] }>;
}

export interface TailoringRequirement {
  requirement: string;
  category: RequirementCategory;
  status: EvidenceStatus;
  sourceEvidence: string | null;
  tailoredEvidence: string | null;
  explanation: string;
}

export interface TailoringReport {
  jobAnalysis: {
    mandatorySkills: string[];
    desirableSkills: string[];
    responsibilities: string[];
    domainKnowledge: string[];
    experienceExpectations: string[];
    keywords: string[];
  };
  requirements: TailoringRequirement[];
  missingRequirements: Array<{ requirement: string; explanation: string }>;
  evidenceMap: Array<{ tailoredClaim: string; sourceEvidence: string }>;
  matchAssessment: { estimatedMatchPercent: number; summary: string; caveats: string[] };
}

export interface TailorResult {
  /** Full rewritten resume as plain text */
  tailoredText: string;
  /** Important job-description keywords absent from the original resume */
  missingKeywords: string[];
  /** Map of keyword → occurrence count in the tailored text */
  keywordDensity: Record<string, number>;
  /** Estimated ATS score of the original resume (0-100) */
  scoreBefore: number;
  /** Estimated ATS score of the tailored resume (0-100) */
  scoreAfter: number;
  /** Human-readable list of changes applied, ranked by impact */
  changesApplied: string[];
  /** Validated machine-readable facts extracted from the source resume */
  resumeProfile: ResumeProfile;
  /** Evidence-backed job requirements coverage and match assessment */
  tailoringReport: TailoringReport;
}

/** Cover letter generation parameters */
export interface GenerateCoverLetterParams {
  resumeText: string;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  variant: 'STANDARD' | 'CONCISE' | 'DETAILED' | 'HIRING_MANAGER';
  hiringManagerName?: string;
}

/** Minimal token-usage record written to ai_usage table */
export interface AIUsageRecord {
  modelName: string;
  feature: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  tier?: string;
}
