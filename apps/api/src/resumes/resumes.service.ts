import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { AIService } from '../ai/ai.service';
import { ExportService } from '../export/export.service';
import { extractTextFromBuffer, SUPPORTED_MIME_TYPES } from '../common/utils/text-extractor';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { TailorResumeDto } from './dto/tailor-resume.dto';
import { UpdateResumeVersionDto } from './dto/update-resume-version.dto';
import type { ATSAnalysisResult } from '../ai/interfaces/ai.interfaces';
import type { Express } from 'express';

function isATSAnalysisResult(value: unknown): value is ATSAnalysisResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const analysis = value as Record<string, unknown>;
  const grades = ['A', 'B', 'C', 'D', 'F'];
  const stringArrays = [
    analysis.formattingIssues,
    analysis.keywordSuggestions,
    analysis.missingSections,
    analysis.strengths,
    analysis.improvements,
  ];

  return (
    typeof analysis.healthScore === 'number' &&
    grades.includes(String(analysis.grade)) &&
    typeof analysis.summary === 'string' &&
    stringArrays.every(
      (items) => Array.isArray(items) && items.every((item) => typeof item === 'string'),
    )
  );
}

function normalizeEvidence(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function preserveOriginalContactLines(originalText: string, tailoredText: string): string {
  const contacts = originalText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length <= 500 &&
        /@|https?:\/\/|(?:linkedin|github)\.com|\+?\d[\d\s().-]{7,}\d/i.test(line),
    );
  const result = tailoredText.split('\n');
  const firstSection = result.findIndex((line) =>
    /^(PROFESSIONAL SUMMARY|SUMMARY|TECHNICAL SKILLS|SKILLS|PROFESSIONAL EXPERIENCE|EXPERIENCE|EDUCATION|CERTIFICATIONS)\s*$/i.test(
      line.trim(),
    ),
  );
  const insertAt = firstSection >= 0 ? firstSection : Math.min(3, result.length);
  const missing = contacts.filter(
    (line) => !normalizeEvidence(tailoredText).includes(normalizeEvidence(line)),
  );
  if (!missing.length) return tailoredText;
  result.splice(insertAt, 0, ...missing);
  return result.join('\n').replace(/\n{3,}/g, '\n\n');
}

function validateTailoringEvidence(
  result: Awaited<ReturnType<AIService['tailorResume']>>['result'],
  originalText: string,
): void {
  const normalizedSource = normalizeEvidence(originalText);
  let droppedMappings = 0;
  result.tailoringReport.evidenceMap = result.tailoringReport.evidenceMap.filter((entry) => {
    const evidence = normalizeEvidence(entry.sourceEvidence);
    const verified = evidence.length >= 12 && normalizedSource.includes(evidence);
    if (!verified) droppedMappings += 1;
    return verified;
  });

  for (const requirement of result.tailoringReport.requirements) {
    const evidence = requirement.sourceEvidence
      ? normalizeEvidence(requirement.sourceEvidence)
      : '';
    if (
      requirement.status !== 'missing' &&
      (!evidence || evidence.length < 12 || !normalizedSource.includes(evidence))
    ) {
      requirement.status = 'missing';
      requirement.sourceEvidence = null;
      requirement.tailoredEvidence = null;
      requirement.explanation =
        'No verifiable source excerpt was returned. Review manually before adding this claim.';
      if (
        !result.tailoringReport.missingRequirements.some(
          (entry) => entry.requirement.toLowerCase() === requirement.requirement.toLowerCase(),
        )
      ) {
        result.tailoringReport.missingRequirements.push({
          requirement: requirement.requirement,
          explanation: requirement.explanation,
        });
      }
      if (
        !result.missingKeywords.some(
          (item) => item.toLowerCase() === requirement.requirement.toLowerCase(),
        )
      ) {
        result.missingKeywords.push(requirement.requirement);
      }
    }
  }

  if (droppedMappings > 0) {
    result.tailoringReport.matchAssessment.caveats.push(
      `${droppedMappings} AI evidence references could not be verified against the source text and were omitted.`,
    );
  }
}

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly ai: AIService,
    private readonly exporter: ExportService,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async resolveUserId(supabaseId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new NotFoundException('User profile not found.');
    return user.id;
  }

  private async assertOwnership(resumeId: string, userId: string) {
    const resume = await this.prisma.resume.findUnique({ where: { id: resumeId } });
    if (!resume) throw new NotFoundException(`Resume ${resumeId} not found`);
    if (resume.userId !== userId) throw new ForbiddenException('Access denied');
    return resume;
  }

  private async getResumeText(resume: {
    s3Key: string;
    mimeType: string;
    parsedText: string | null;
    id: string;
  }): Promise<string> {
    let text = resume.parsedText ?? '';
    if (!text || text.length < 50) {
      const buffer = await this.s3.downloadFile(resume.s3Key);
      text = await extractTextFromBuffer(buffer, resume.mimeType);
      if (text) {
        await this.prisma.resume.update({ where: { id: resume.id }, data: { parsedText: text } });
      }
    }
    if (!text)
      throw new BadRequestException(
        'Could not extract text. The file may be image-based or password-protected.',
      );
    return text;
  }

  // ─── Upload ────────────────────────────────────────────────────────────────

  async upload(supabaseId: string, file: Express.Multer.File) {
    if (!SUPPORTED_MIME_TYPES.includes(file.mimetype as any))
      throw new BadRequestException(
        'Only PDF, DOCX, and .tex files are accepted. Received: ' + file.mimetype,
      );
    if (file.size > 10 * 1024 * 1024)
      throw new BadRequestException('File exceeds the 10 MB size limit');

    const extension = file.originalname.split('.').pop()?.toLowerCase();
    const hasPdfSignature = file.buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    const hasZipSignature = file.buffer.subarray(0, 2).toString('ascii') === 'PK';
    if (extension === 'pdf' && !hasPdfSignature) {
      throw new BadRequestException('The file content does not match a PDF document.');
    }
    if (extension === 'docx' && !hasZipSignature) {
      throw new BadRequestException('The file content does not match a DOCX document.');
    }
    if (
      extension === 'tex' &&
      !['text/plain', 'text/x-tex', 'application/x-tex'].includes(file.mimetype)
    ) {
      throw new BadRequestException('The .tex file has an unsupported content type.');
    }
    if (!['pdf', 'docx', 'tex'].includes(extension ?? '')) {
      throw new BadRequestException('Resume files must use the .pdf, .docx, or .tex extension.');
    }

    const userId = await this.resolveUserId(supabaseId);
    const parsedText = await extractTextFromBuffer(file.buffer, file.mimetype);
    if (parsedText.length < 50) {
      throw new BadRequestException(
        'We could not read enough text from this resume. Check that it is not password-protected and that scanned PDFs have OCR available.',
      );
    }
    const { key, url } = await this.s3.uploadFile(file.buffer, file.originalname, file.mimetype);

    const title =
      file.originalname
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .trim() || 'My Resume';
    const resume = await this.prisma.resume.create({
      data: {
        userId,
        title,
        originalName: file.originalname,
        s3Key: key,
        s3Url: url,
        fileSize: file.size,
        mimeType: file.mimetype,
        parsedText: parsedText || null,
      },
    });
    this.logger.log(`Uploaded resume ${resume.id} for user ${userId}`);
    return resume;
  }

  // ─── List / Get / Update / Delete ──────────────────────────────────────────

  async findAll(supabaseId: string) {
    const userId = await this.resolveUserId(supabaseId);
    const resumes = await this.prisma.resume.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        originalName: true,
        s3Key: true,
        s3Url: true,
        fileSize: true,
        mimeType: true,
        atsScore: true,
        isDefault: true,
        analysisResult: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return Promise.all(
      resumes.map(async (resume) => ({
        ...resume,
        downloadUrl: await this.s3.getPresignedUrl(resume.s3Key),
      })),
    );
  }

  async findOne(supabaseId: string, resumeId: string) {
    const userId = await this.resolveUserId(supabaseId);
    const resume = await this.assertOwnership(resumeId, userId);
    const downloadUrl = await this.s3.getPresignedUrl(resume.s3Key);
    return { ...resume, downloadUrl };
  }

  async update(supabaseId: string, resumeId: string, dto: UpdateResumeDto) {
    const userId = await this.resolveUserId(supabaseId);
    await this.assertOwnership(resumeId, userId);
    if (dto.isDefault)
      await this.prisma.resume.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    return this.prisma.resume.update({ where: { id: resumeId }, data: { ...dto } });
  }

  async delete(supabaseId: string, resumeId: string) {
    const userId = await this.resolveUserId(supabaseId);
    const resume = await this.assertOwnership(resumeId, userId);
    await this.s3.deleteFile(resume.s3Key);
    await this.prisma.resume.delete({ where: { id: resumeId } });
  }

  // ─── ATS Analysis ─────────────────────────────────────────────────────────

  async analyse(supabaseId: string, resumeId: string) {
    const userId = await this.resolveUserId(supabaseId);
    const resume = await this.assertOwnership(resumeId, userId);
    if (resume.atsScore > 0 && isATSAnalysisResult(resume.analysisResult)) {
      return {
        resumeId: resume.id,
        atsScore: resume.atsScore,
        analysis: resume.analysisResult,
        tokenUsage: { total: 0, estimatedCostUsd: 0 },
        cached: true,
      };
    }

    const text = await this.getResumeText(resume);

    const { result, usage } = await this.ai.analyseResume(text);

    await this.prisma.aIUsage.create({
      data: {
        userId,
        resumeId,
        modelName: usage.modelName,
        feature: usage.feature,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        estimatedCostUsd: usage.estimatedCostUsd,
        tier: usage.tier || 'free',
      },
    });

    const updated = await this.prisma.resume.update({
      where: { id: resumeId },
      data: { atsScore: result.healthScore, analysisResult: result as any },
    });

    return {
      resumeId: updated.id,
      atsScore: updated.atsScore,
      analysis: result,
      tokenUsage: { total: usage.totalTokens, estimatedCostUsd: usage.estimatedCostUsd },
      cached: false,
    };
  }

  async match(supabaseId: string, resumeId: string, jobDescription: string) {
    const userId = await this.resolveUserId(supabaseId);
    const resume = await this.assertOwnership(resumeId, userId);
    const resumeText = await this.getResumeText(resume);
    const stopWords = new Set(
      'about above after again also and any are around because been before being between both but can could did does each few for from further get give had has have having her here him his how into its job jobs just may might more most must new not now off on once only other our out over role roles same should since some such than that the their them then there these they this those through time under until upon very was were what when where which while who why will with work worked working would your you experience responsibilities responsibility candidate candidates company please required requirement qualifications qualification preferred welcome looking seeking joining'.split(
        ' ',
      ),
    );
    const words = (text: string) =>
      new Set(
        text
          .toLocaleLowerCase()
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .match(/[\p{L}\p{N}+#.]{2,}/gu)
          ?.filter((word) => word.length > 1 && !stopWords.has(word)) ?? [],
      );
    const resumeWords = words(resumeText);
    const jobWords = [...words(jobDescription)];
    if (jobWords.length === 0) throw new BadRequestException('No role keywords were found.');
    const matchedKeywords = jobWords.filter((word) => resumeWords.has(word));
    const missingKeywords = jobWords.filter((word) => !resumeWords.has(word));
    return {
      resumeId,
      score: Math.round((matchedKeywords.length / jobWords.length) * 100),
      matchedKeywords: matchedKeywords.slice(0, 12),
      missingKeywords: missingKeywords.slice(0, 12),
      method: 'keyword-overlap',
      caveat: 'A keyword overlap estimate, not an employer ATS score or hiring prediction.',
    };
  }

  // ─── Tailor (Sprint 3) ────────────────────────────────────────────────────

  async tailor(supabaseId: string, resumeId: string, dto: TailorResumeDto) {
    const userId = await this.resolveUserId(supabaseId);
    const resume = await this.assertOwnership(resumeId, userId);
    const text = await this.getResumeText(resume);

    const { result, usage } = await this.ai.tailorResume(
      text,
      dto.jobDescription,
      dto.jobTitle,
      dto.companyName,
    );
    validateTailoringEvidence(result, text);
    result.tailoredText = preserveOriginalContactLines(text, result.tailoredText);

    // Log AI usage
    await this.prisma.aIUsage.create({
      data: {
        userId,
        resumeId,
        modelName: usage.modelName,
        feature: usage.feature,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        estimatedCostUsd: usage.estimatedCostUsd,
        tier: usage.tier || 'free',
      },
    });

    // Determine next version number
    const count = await this.prisma.resumeVersion.count({ where: { resumeId } });

    // Save tailored version
    const version = await this.prisma.resumeVersion.create({
      data: {
        resumeId,
        versionNum: count + 1,
        tailoredContent: result.tailoredText,
        changesApplied: result.changesApplied as any,
        keywordDensity: result.keywordDensity as any,
        tailoringReport: result.tailoringReport as any,
        designTemplate: dto.designTemplate ?? 'modern',
        pageSize: dto.pageSize ?? 'A4',
        scoreBefore: result.scoreBefore,
        scoreAfter: result.scoreAfter,
        jobTitle: dto.jobTitle,
        companyName: dto.companyName,
      },
    });

    return {
      versionId: version.id,
      versionNum: version.versionNum,
      tailoredText: result.tailoredText,
      originalText: text,
      resumeProfile: result.resumeProfile,
      tailoringReport: result.tailoringReport,
      missingKeywords: result.missingKeywords,
      keywordDensity: result.keywordDensity,
      scoreBefore: result.scoreBefore,
      scoreAfter: result.scoreAfter,
      changesApplied: result.changesApplied,
      tokenUsage: { total: usage.totalTokens, estimatedCostUsd: usage.estimatedCostUsd },
    };
  }

  async updateVersion(
    supabaseId: string,
    resumeId: string,
    versionId: string,
    dto: UpdateResumeVersionDto,
  ) {
    const userId = await this.resolveUserId(supabaseId);
    await this.assertOwnership(resumeId, userId);
    const version = await this.prisma.resumeVersion.findFirst({
      where: { id: versionId, resumeId },
      select: { id: true, tailoringReport: true },
    });
    if (!version) throw new NotFoundException(`Resume version ${versionId} not found`);
    const existingReport =
      typeof version.tailoringReport === 'object' && version.tailoringReport !== null
        ? (version.tailoringReport as Record<string, unknown>)
        : {};
    const existingAssessment =
      typeof existingReport.matchAssessment === 'object' && existingReport.matchAssessment !== null
        ? (existingReport.matchAssessment as Record<string, unknown>)
        : {};
    const existingCaveats = Array.isArray(existingAssessment.caveats)
      ? existingAssessment.caveats.filter((item): item is string => typeof item === 'string')
      : [];
    const updatedReport = {
      ...existingReport,
      evidenceMap: [],
      matchAssessment: {
        ...existingAssessment,
        caveats: [
          ...existingCaveats,
          'The resume was manually edited after analysis. Recheck edited claims against the original source before applying.',
        ],
      },
    };
    const updated = await this.prisma.resumeVersion.update({
      where: { id: version.id },
      data: {
        tailoredContent: dto.tailoredContent.replace(/\r\n?/g, '\n').trim(),
        tailoringReport: updatedReport as any,
      },
      select: { id: true, tailoredContent: true, tailoringReport: true },
    });
    return {
      versionId: updated.id,
      tailoredText: updated.tailoredContent,
      tailoringReport: updated.tailoringReport,
    };
  }

  // ─── Export (Sprint 3) ────────────────────────────────────────────────────

  async exportPdf(
    supabaseId: string,
    resumeId: string,
    versionId?: string,
    template?: string,
    pageSize?: string,
  ): Promise<{ buffer: Buffer; filename: string; engine: string }> {
    const { resume, content, version } = await this.getExportContent(
      supabaseId,
      resumeId,
      versionId,
    );
    const { buffer, engine } = await this.exporter.generateCompiledPdf({
      title: resume.title,
      content,
      author: this.resumeAuthor(content),
      atsFriendly: true,
      template: template ?? version?.designTemplate ?? 'modern',
      pageSize: pageSize ?? version?.pageSize ?? 'A4',
    });
    return { buffer, filename: this.exporter.toFilename(resume.title, 'pdf'), engine };
  }

  async exportDocx(
    supabaseId: string,
    resumeId: string,
    versionId?: string,
    template?: string,
    pageSize?: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const { resume, content, version } = await this.getExportContent(
      supabaseId,
      resumeId,
      versionId,
    );
    const buffer = await this.exporter.generateDocx({
      title: resume.title,
      content,
      author: this.resumeAuthor(content),
      atsFriendly: true,
      template: template ?? version?.designTemplate ?? 'modern',
      pageSize: pageSize ?? version?.pageSize ?? 'A4',
    });
    return { buffer, filename: this.exporter.toFilename(resume.title, 'docx') };
  }

  async exportLatex(
    supabaseId: string,
    resumeId: string,
    versionId?: string,
    template?: string,
    pageSize?: string,
  ) {
    const { resume, content, version } = await this.getExportContent(
      supabaseId,
      resumeId,
      versionId,
    );
    return {
      source: this.exporter.generateLatex({
        title: resume.title,
        content,
        author: this.resumeAuthor(content),
        atsFriendly: true,
        template: template ?? version?.designTemplate ?? 'modern',
        pageSize: pageSize ?? version?.pageSize ?? 'A4',
      }),
      filename: this.exporter.toFilename(resume.title, 'tex'),
    };
  }

  private async getExportContent(supabaseId: string, resumeId: string, versionId?: string) {
    const userId = await this.resolveUserId(supabaseId);
    const resume = await this.assertOwnership(resumeId, userId);
    const version = versionId
      ? await this.prisma.resumeVersion.findFirst({ where: { id: versionId, resumeId } })
      : await this.prisma.resumeVersion.findFirst({
          where: { resumeId },
          orderBy: { versionNum: 'desc' },
        });

    if (versionId && !version) throw new NotFoundException(`Resume version ${versionId} not found`);
    const content = version?.tailoredContent ?? (await this.getResumeText(resume));
    return { resume, content, version };
  }

  // ─── List versions ────────────────────────────────────────────────────────

  async getVersions(supabaseId: string, resumeId: string) {
    const userId = await this.resolveUserId(supabaseId);
    await this.assertOwnership(resumeId, userId);
    return this.prisma.resumeVersion.findMany({
      where: { resumeId },
      orderBy: { versionNum: 'desc' },
      select: {
        id: true,
        versionNum: true,
        scoreBefore: true,
        scoreAfter: true,
        designTemplate: true,
        pageSize: true,
        tailoringReport: true,
        jobTitle: true,
        companyName: true,
        changesApplied: true,
        keywordDensity: true,
        createdAt: true,
      },
    });
  }

  private resumeAuthor(content: string): string {
    const firstLine = content.split(/\r?\n/, 1)[0]?.trim() ?? '';
    return firstLine.length > 0 && firstLine.length <= 120 ? firstLine : 'JobIN candidate';
  }
}
