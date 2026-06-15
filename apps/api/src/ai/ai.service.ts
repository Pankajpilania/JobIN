import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  ATSAnalysisResult,
  TailorResult,
  GenerateCoverLetterParams,
  AIUsageRecord,
} from './interfaces/ai.interfaces';

function gradeFromScore(score: number): ATSAnalysisResult['grade'] {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function buildUsage(
  inputTokens: number,
  outputTokens: number,
  feature: string,
  model: string,
): AIUsageRecord {
  const isPaid = process.env.GEMINI_PAID_TIER === 'true';
  const estimatedCost = isPaid
    ? (inputTokens / 1_000_000 * 0.075) + (outputTokens / 1_000_000 * 0.30)
    : 0;

  return {
    modelName: model,
    feature,
    promptTokens: inputTokens,
    completionTokens: outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCostUsd: +estimatedCost.toFixed(6),
    tier: isPaid ? 'paid' : 'free',
  };
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  // ─── 1. ATS Resume Analysis ───────────────────────────────────────────────

  async analyseResume(resumeText: string): Promise<{
    result: ATSAnalysisResult;
    usage: AIUsageRecord;
  }> {
    const systemPrompt = `You are an expert ATS analyst and professional resume reviewer with 15 years of experience.
Analyse resume text for ATS compatibility and return a detailed, actionable JSON assessment.

Rules:
- healthScore must accurately reflect true ATS compatibility
- formattingIssues must focus on what ATS parsers struggle with (columns, tables, graphics, headers/footers)
- keywordSuggestions must be real industry keywords, not vague categories
- missingSections must be concrete (e.g. "GitHub Profile URL", "Certifications")
- improvements must be ranked by impact, most impactful first

Return ONLY valid JSON:
{
  "healthScore": <number 0-100>,
  "grade": <"A"|"B"|"C"|"D"|"F">,
  "summary": <string, 2-3 sentences>,
  "formattingIssues": [<string>,...],
  "keywordSuggestions": [<string>,...],
  "missingSections": [<string>,...],
  "strengths": [<string>,...],
  "improvements": [<string>,...]
}`;

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseMimeType: 'application/json',
        },
      });

      const prompt = `System Instructions:\n${systemPrompt}\n\nAnalyse this resume:\n\n${resumeText.slice(0, 12_000)}`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = JSON.parse(text) as Partial<ATSAnalysisResult>;

      const analysisResult: ATSAnalysisResult = {
        healthScore:        Number(parsed.healthScore ?? 50),
        grade:              gradeFromScore(Number(parsed.healthScore ?? 50)),
        summary:            parsed.summary             ?? 'Analysis complete.',
        formattingIssues:   parsed.formattingIssues    ?? [],
        keywordSuggestions: parsed.keywordSuggestions  ?? [],
        missingSections:    parsed.missingSections      ?? [],
        strengths:          parsed.strengths            ?? [],
        improvements:       parsed.improvements         ?? [],
      };

      const usageMetadata = result.response.usageMetadata;
      const usage = buildUsage(
        usageMetadata?.promptTokenCount ?? 0,
        usageMetadata?.candidatesTokenCount ?? 0,
        'resume_ats_analysis',
        this.modelName,
      );

      this.logger.log(`ATS analysis — score=${analysisResult.healthScore} tokens=${usage.totalTokens} cost=$${usage.estimatedCostUsd} tier=${usage.tier}`);
      return { result: analysisResult, usage };
    } catch (err) {
      this.logger.error(
        `ATS analysis failed:\n` +
        `  Message: ${err.message}\n` +
        `  Status: ${err.status ?? err.statusCode ?? 'unknown'}\n` +
        `  Error details: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`
      );
      throw new InternalServerErrorException(`AI analysis failed: ${err.message}`);
    }
  }

  // ─── 2. Resume Tailoring (XYZ formula) ───────────────────────────────────

  async tailorResume(
    resumeText: string,
    jobDescription: string,
    jobTitle = '',
    companyName = '',
  ): Promise<{ result: TailorResult; usage: AIUsageRecord }> {
    const systemPrompt = `You are an elite resume writer and ATS optimization expert.
Tailor the candidate's resume for the specific job posting provided.

XYZ Achievement Formula — rewrite bullet points as:
"Accomplished [X] as measured by [Y], by doing [Z]"

Rules:
1. Embed job-description keywords naturally throughout the resume
2. Mirror the terminology and language from the job posting
3. Prioritize matching required qualifications over preferred
4. Rephrase factually — NEVER fabricate achievements or numbers
5. Preserve all factual content: dates, companies, technologies mentioned

Return ONLY valid JSON:
{
  "tailoredText": "<complete rewritten resume as plain text>",
  "missingKeywords": ["<keyword in JD but absent from original resume>"],
  "keywordDensity": {"<keyword>": <count in tailored text>},
  "scoreBefore": <estimated ATS score of original 0-100>,
  "scoreAfter": <estimated ATS score of tailored version 0-100>,
  "changesApplied": ["<brief description of each significant change, most impactful first>"]
}`;

    const userPrompt = `Job Title: ${jobTitle || 'Not specified'}
Company: ${companyName || 'Not specified'}

JOB DESCRIPTION:
${jobDescription.slice(0, 6_000)}

ORIGINAL RESUME:
${resumeText.slice(0, 6_000)}`;

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseMimeType: 'application/json',
        },
      });

      const prompt = `System Instructions:\n${systemPrompt}\n\n${userPrompt}`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = JSON.parse(text) as Partial<TailorResult>;

      const tailorResult: TailorResult = {
        tailoredText:    parsed.tailoredText    ?? resumeText,
        missingKeywords: parsed.missingKeywords ?? [],
        keywordDensity:  parsed.keywordDensity  ?? {},
        scoreBefore:     Number(parsed.scoreBefore ?? 0),
        scoreAfter:      Number(parsed.scoreAfter  ?? 0),
        changesApplied:  parsed.changesApplied   ?? [],
      };

      const usageMetadata = result.response.usageMetadata;
      const usage = buildUsage(
        usageMetadata?.promptTokenCount ?? 0,
        usageMetadata?.candidatesTokenCount ?? 0,
        'resume_tailoring',
        this.modelName,
      );

      this.logger.log(`Tailoring — ${tailorResult.scoreBefore}→${tailorResult.scoreAfter} tokens=${usage.totalTokens} cost=$${usage.estimatedCostUsd} tier=${usage.tier}`);
      return { result: tailorResult, usage };
    } catch (err) {
      this.logger.error(`Resume tailoring failed: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Resume tailoring failed. Please try again.');
    }
  }

  // ─── 3. Cover Letter Generation ───────────────────────────────────────────

  async generateCoverLetter(params: GenerateCoverLetterParams): Promise<{
    content: string;
    usage: AIUsageRecord;
  }> {
    const { resumeText, jobTitle, companyName, jobDescription, variant, hiringManagerName } = params;

    const variantInstructions: Record<string, string> = {
      STANDARD:       'Write a professional cover letter of 350-400 words.',
      CONCISE:        'Write a concise, punchy cover letter of MAXIMUM 250 words. Every sentence must earn its place.',
      DETAILED:       'Write a comprehensive cover letter of 500-600 words that thoroughly addresses the role requirements.',
      HIRING_MANAGER: `Write a cover letter addressed directly to ${hiringManagerName ?? 'the Hiring Manager'} by name. Use "Dear ${hiringManagerName ?? 'Hiring Manager'}," as the greeting. 350-400 words.`,
    };

    const systemPrompt = `You are an expert cover letter writer who crafts compelling, personalised letters that get candidates noticed.

Instructions:
- ${variantInstructions[variant] ?? variantInstructions['STANDARD']}
- Open with a strong hook that references the specific role and company
- Highlight 2-3 achievements from the resume that directly match the job requirements
- Show genuine knowledge of the company/role
- Close with a clear call to action
- Use first person, active voice, professional but human tone
- Do NOT use generic phrases like "I am writing to express my interest"
- Do NOT use bullet points — flowing paragraphs only
- Output the cover letter text ONLY — no subject line, no metadata`;

    const userPrompt = `Role: ${jobTitle} at ${companyName}

JOB DESCRIPTION:
${jobDescription.slice(0, 4_000)}

RESUME (source of achievements):
${resumeText.slice(0, 4_000)}`;

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
      });

      const prompt = `System Instructions:\n${systemPrompt}\n\n${userPrompt}`;
      const result = await model.generateContent(prompt);
      const content = result.response.text().trim();

      const usageMetadata = result.response.usageMetadata;
      const usage = buildUsage(
        usageMetadata?.promptTokenCount ?? 0,
        usageMetadata?.candidatesTokenCount ?? 0,
        `cover_letter_${variant.toLowerCase()}`,
        this.modelName,
      );

      this.logger.log(`Cover letter (${variant}) — ${content.split(/\s+/).length} words tokens=${usage.totalTokens} cost=$${usage.estimatedCostUsd} tier=${usage.tier}`);
      return { content, usage };
    } catch (err) {
      this.logger.error(`Cover letter generation failed: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Cover letter generation failed. Please try again.');
    }
  }
}
