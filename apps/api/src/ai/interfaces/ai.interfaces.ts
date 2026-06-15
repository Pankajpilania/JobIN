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
