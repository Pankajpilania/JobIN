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
        'Only PDF and DOCX files are accepted. Received: ' + file.mimetype,
      );
    if (file.size > 10 * 1024 * 1024)
      throw new BadRequestException('File exceeds the 10 MB size limit');

    const userId = await this.resolveUserId(supabaseId);
    const parsedText = await extractTextFromBuffer(file.buffer, file.mimetype);
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
      resumes.map(async (resume) => {
        try {
          const downloadUrl = await this.s3.getPresignedUrl(resume.s3Key);
          return { ...resume, downloadUrl };
        } catch {
          return { ...resume, downloadUrl: resume.s3Url };
        }
      }),
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
      missingKeywords: result.missingKeywords,
      keywordDensity: result.keywordDensity,
      scoreBefore: result.scoreBefore,
      scoreAfter: result.scoreAfter,
      changesApplied: result.changesApplied,
      tokenUsage: { total: usage.totalTokens, estimatedCostUsd: usage.estimatedCostUsd },
    };
  }

  // ─── Export (Sprint 3) ────────────────────────────────────────────────────

  async exportPdf(
    supabaseId: string,
    resumeId: string,
    versionId?: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const { resume, content } = await this.getExportContent(supabaseId, resumeId, versionId);
    const buffer = await this.exporter.generatePdf({ title: resume.title, content, atsFriendly: true });
    return { buffer, filename: this.exporter.toFilename(resume.title, 'pdf') };
  }

  async exportDocx(
    supabaseId: string,
    resumeId: string,
    versionId?: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const { resume, content } = await this.getExportContent(supabaseId, resumeId, versionId);
    const buffer = await this.exporter.generateDocx({ title: resume.title, content, atsFriendly: true });
    return { buffer, filename: this.exporter.toFilename(resume.title, 'docx') };
  }

  async exportLatex(supabaseId: string, resumeId: string, versionId?: string) {
    const { resume, content } = await this.getExportContent(supabaseId, resumeId, versionId);
    return {
      source: this.exporter.generateLatex({ title: resume.title, content, atsFriendly: true }),
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
    return { resume, content };
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
        jobTitle: true,
        companyName: true,
        changesApplied: true,
        keywordDensity: true,
        createdAt: true,
      },
    });
  }
}
