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
    ? (inputTokens / 1_000_000) * 0.075 + (outputTokens / 1_000_000) * 0.3
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
          temperature: 0,
        },
      });

      const prompt = `System Instructions:\n${systemPrompt}\n\nAnalyse this resume:\n\n${resumeText.slice(0, 12_000)}`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = JSON.parse(text) as Partial<ATSAnalysisResult>;

      const analysisResult: ATSAnalysisResult = {
        healthScore: Number(parsed.healthScore ?? 50),
        grade: gradeFromScore(Number(parsed.healthScore ?? 50)),
        summary: parsed.summary ?? 'Analysis complete.',
        formattingIssues: parsed.formattingIssues ?? [],
        keywordSuggestions: parsed.keywordSuggestions ?? [],
        missingSections: parsed.missingSections ?? [],
        strengths: parsed.strengths ?? [],
        improvements: parsed.improvements ?? [],
      };

      const usageMetadata = result.response.usageMetadata;
      const usage = buildUsage(
        usageMetadata?.promptTokenCount ?? 0,
        usageMetadata?.candidatesTokenCount ?? 0,
        'resume_ats_analysis',
        this.modelName,
      );

      this.logger.log(
        `ATS analysis — score=${analysisResult.healthScore} tokens=${usage.totalTokens} cost=$${usage.estimatedCostUsd} tier=${usage.tier}`,
      );
      return { result: analysisResult, usage };
    } catch (err) {
      this.logger.error(
        `ATS analysis failed:\n` +
          `  Message: ${err.message}\n` +
          `  Status: ${err.status ?? err.statusCode ?? 'unknown'}\n` +
          `  Error details: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`,
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
6. Return a clean, ATS-friendly, single-column resume in plain text. Do not use Markdown, tables, columns, decorative symbols, or a cover-page title.
7. Use this section order when the source contains relevant information: candidate name; target/professional title; contact details; PROFESSIONAL SUMMARY; TECHNICAL SKILLS; PROFESSIONAL EXPERIENCE; EDUCATION; CERTIFICATIONS; ADDITIONAL INFORMATION. Include selected projects beneath the relevant employer when present in the source.
8. Keep the candidate name, contact details, employers, locations, job titles, dates, qualifications, and certifications factual and unchanged. Never fill gaps with guesses or placeholders.
9. Put each section heading on its own line in uppercase. Keep the header to the candidate name, professional title, and up to two lines of existing contact details. Do not repeat the name or add an objective.
10. In TECHNICAL SKILLS, put each existing skill category on its own line using "Category: skills".
11. In PROFESSIONAL EXPERIENCE, use one employer line as "Employer | Location", the next line as "Job Title | Dates", then any factual client/context line and one achievement per line prefixed with "• ". Use "Selected Projects at Employer" as a subheading when applicable, with each project on a separate bullet.
12. Put each education entry on its own line; retain its degree, institution, location, and date. Keep certifications and additional information as concise, factual lines.
13. Preserve the source's original section order and bullet structure when it differs materially from this suggested structure; do not flatten the resume into paragraphs.

Return ONLY valid JSON:
{
  "tailoredText": "<complete structured resume as plain text, one item per line>",
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
        tailoredText: parsed.tailoredText ?? resumeText,
        missingKeywords: parsed.missingKeywords ?? [],
        keywordDensity: parsed.keywordDensity ?? {},
        scoreBefore: Number(parsed.scoreBefore ?? 0),
        scoreAfter: Number(parsed.scoreAfter ?? 0),
        changesApplied: parsed.changesApplied ?? [],
      };

      const usageMetadata = result.response.usageMetadata;
      const usage = buildUsage(
        usageMetadata?.promptTokenCount ?? 0,
        usageMetadata?.candidatesTokenCount ?? 0,
        'resume_tailoring',
        this.modelName,
      );

      this.logger.log(
        `Tailoring — ${tailorResult.scoreBefore}→${tailorResult.scoreAfter} tokens=${usage.totalTokens} cost=$${usage.estimatedCostUsd} tier=${usage.tier}`,
      );
      return { result: tailorResult, usage };
    } catch (err) {
      this.logger.error(`Resume tailoring failed: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Resume tailoring failed. Please try again.');
    }
  }

  async generateInterviewQuestion(params: {
    resumeText: string;
    roleTitle: string;
    companyName: string;
    previousQuestions: string[];
  }): Promise<{ question: string; usage: AIUsageRecord }> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });
    const prompt = `You are an expert interview coach. Generate exactly one fresh, realistic interview question tailored to the candidate's resume and target role at the target company. The question should test a relevant skill or experience, avoid generic questions, and not repeat any prior question. Do not invent confidential company information. Return only JSON: {"question":"..."}.

Target role: ${params.roleTitle}
Target company: ${params.companyName}
Candidate resume:
${params.resumeText.slice(0, 8000)}
Previous questions:
${JSON.stringify(params.previousQuestions.slice(-20))}`;

    try {
      const result = await model.generateContent(prompt);
      const parsed = JSON.parse(result.response.text()) as { question?: unknown };
      if (typeof parsed.question !== 'string' || !parsed.question.trim()) {
        throw new Error('AI returned an empty interview question');
      }
      const metadata = result.response.usageMetadata;
      return {
        question: parsed.question.trim(),
        usage: buildUsage(
          metadata?.promptTokenCount ?? 0,
          metadata?.candidatesTokenCount ?? 0,
          'interview_question',
          this.modelName,
        ),
      };
    } catch (err) {
      this.logger.error(`Interview question generation failed: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Could not generate an interview question. Please try again.');
    }
  }

  async evaluateInterviewAnswer(params: {
    resumeText: string;
    roleTitle: string;
    companyName: string;
    question: string;
    answer: string;
  }): Promise<{
    score: number;
    evaluation: string;
    strengths: string[];
    improvements: string[];
    usage: AIUsageRecord;
  }> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });
    const prompt = `Evaluate this candidate's interview answer fairly and specifically for the target role. Score the answer from 1 to 10 (integer), considering relevance, evidence, clarity, and impact. Use resume facts as context, do not penalize an honest answer for not repeating resume wording. Give concise actionable feedback. Return only JSON: {"score":1,"evaluation":"...","strengths":["..."],"improvements":["..."]}.

Target role: ${params.roleTitle}
Target company: ${params.companyName}
Resume context:
${params.resumeText.slice(0, 6000)}
Interview question: ${params.question.slice(0, 2000)}
Candidate answer: ${params.answer.slice(0, 6000)}`;

    try {
      const result = await model.generateContent(prompt);
      const parsed = JSON.parse(result.response.text()) as {
        score?: unknown;
        evaluation?: unknown;
        strengths?: unknown;
        improvements?: unknown;
      };
      const numericScore = Number(parsed.score);
      if (!Number.isFinite(numericScore) || typeof parsed.evaluation !== 'string') {
        throw new Error('AI returned an invalid interview evaluation');
      }
      const metadata = result.response.usageMetadata;
      return {
        score: Math.max(1, Math.min(10, Math.round(numericScore))),
        evaluation: parsed.evaluation,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.filter((item): item is string => typeof item === 'string') : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements.filter((item): item is string => typeof item === 'string') : [],
        usage: buildUsage(
          metadata?.promptTokenCount ?? 0,
          metadata?.candidatesTokenCount ?? 0,
          'interview_answer_evaluation',
          this.modelName,
        ),
      };
    } catch (err) {
      this.logger.error(`Interview answer evaluation failed: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Could not evaluate your answer. Please try again.');
    }
  }

  // ─── 3. Cover Letter Generation ───────────────────────────────────────────

  async generateCoverLetter(params: GenerateCoverLetterParams): Promise<{
    content: string;
    usage: AIUsageRecord;
  }> {
    const { resumeText, jobTitle, companyName, jobDescription, variant, hiringManagerName } =
      params;

    const variantInstructions: Record<string, string> = {
      STANDARD: 'Write a professional cover letter of 350-400 words.',
      CONCISE:
        'Write a concise, punchy cover letter of MAXIMUM 250 words. Every sentence must earn its place.',
      DETAILED:
        'Write a comprehensive cover letter of 500-600 words that thoroughly addresses the role requirements.',
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

      this.logger.log(
        `Cover letter (${variant}) — ${content.split(/\s+/).length} words tokens=${usage.totalTokens} cost=$${usage.estimatedCostUsd} tier=${usage.tier}`,
      );
      return { content, usage };
    } catch (err) {
      this.logger.error(`Cover letter generation failed: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Cover letter generation failed. Please try again.');
    }
  }
}
