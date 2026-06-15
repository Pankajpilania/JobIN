import {
  Injectable, NotFoundException, BadRequestException, Logger, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { AIService } from '../ai/ai.service';
import { ExportService } from '../export/export.service';
import { extractTextFromBuffer } from '../common/utils/text-extractor';
import { GenerateCoverLetterDto } from './dto/generate-cover-letter.dto';

@Injectable()
export class CoverLettersService {
  private readonly logger = new Logger(CoverLettersService.name);

  constructor(
    private readonly prisma:    PrismaService,
    private readonly s3:        S3Service,
    private readonly ai:        AIService,
    private readonly exporter:  ExportService,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async resolveUserId(supabaseId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new NotFoundException('User profile not found.');
    return user.id;
  }

  private async assertCLOwnership(id: string, userId: string) {
    const cl = await this.prisma.coverLetter.findUnique({ where: { id } });
    if (!cl)             throw new NotFoundException(`Cover letter ${id} not found`);
    if (cl.userId !== userId) throw new ForbiddenException('Access denied');
    return cl;
  }

  // ─── Generate ─────────────────────────────────────────────────────────────

  async generate(supabaseId: string, dto: GenerateCoverLetterDto) {
    const userId = await this.resolveUserId(supabaseId);

    // 1. Load the source resume and extract its text
    const resume = await this.prisma.resume.findUnique({ where: { id: dto.resumeId } });
    if (!resume)             throw new NotFoundException('Resume not found');
    if (resume.userId !== userId) throw new ForbiddenException('Access denied');

    let resumeText = resume.parsedText ?? '';
    if (!resumeText || resumeText.length < 50) {
      const buffer = await this.s3.downloadFile(resume.s3Key);
      resumeText   = await extractTextFromBuffer(buffer, resume.mimeType);
      if (!resumeText) throw new BadRequestException('Could not extract text from the selected resume.');
      await this.prisma.resume.update({ where: { id: dto.resumeId }, data: { parsedText: resumeText } });
    }

    // 2. Call Gemini
    const { content, usage } = await this.ai.generateCoverLetter({
      resumeText,
      jobTitle:          dto.jobTitle,
      companyName:       dto.companyName,
      jobDescription:    dto.jobDescription,
      variant:           dto.variant as any,
      hiringManagerName: dto.hiringManagerName,
    });

    // 3. Log AI usage
    await this.prisma.aIUsage.create({
      data: {
        userId,
        resumeId:        dto.resumeId,
        modelName:       usage.modelName,
        feature:         usage.feature,
        promptTokens:    usage.promptTokens,
        completionTokens:usage.completionTokens,
        totalTokens:     usage.totalTokens,
        estimatedCostUsd:usage.estimatedCostUsd,
        tier:            usage.tier || 'free',
      },
    });

    // 4. Count words and save to DB
    const wordCount = content.trim().split(/\s+/).length;

    const coverLetter = await this.prisma.coverLetter.create({
      data: {
        userId,
        resumeId:          dto.resumeId,
        jobTitle:          dto.jobTitle,
        companyName:       dto.companyName,
        hiringManagerName: dto.hiringManagerName,
        variant:           dto.variant as any,
        content,
        wordCount,
      },
    });

    this.logger.log(`Cover letter ${coverLetter.id} generated — ${wordCount} words`);
    return {
      ...coverLetter,
      tokenUsage: { total: usage.totalTokens, estimatedCostUsd: usage.estimatedCostUsd },
    };
  }

  // ─── List ─────────────────────────────────────────────────────────────────

  async findAll(supabaseId: string) {
    const userId = await this.resolveUserId(supabaseId);
    return this.prisma.coverLetter.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      select:  { id: true, jobTitle: true, companyName: true, variant: true, wordCount: true, hiringManagerName: true, createdAt: true, updatedAt: true },
    });
  }

  // ─── Get single ───────────────────────────────────────────────────────────

  async findOne(supabaseId: string, id: string) {
    const userId = await this.resolveUserId(supabaseId);
    return this.assertCLOwnership(id, userId);
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async delete(supabaseId: string, id: string) {
    const userId = await this.resolveUserId(supabaseId);
    await this.assertCLOwnership(id, userId);
    await this.prisma.coverLetter.delete({ where: { id } });
  }

  // ─── Export PDF ───────────────────────────────────────────────────────────

  async exportPdf(supabaseId: string, id: string): Promise<{ buffer: Buffer; filename: string }> {
    const userId = await this.resolveUserId(supabaseId);
    const cl     = await this.assertCLOwnership(id, userId);
    const buffer = await this.exporter.generatePdf({
      title:    `Cover Letter — ${cl.jobTitle} at ${cl.companyName}`,
      subtitle: cl.hiringManagerName ? `Addressed to ${cl.hiringManagerName}` : undefined,
      content:  cl.content,
    });
    return { buffer, filename: this.exporter.toFilename(`Cover_Letter_${cl.companyName}_${cl.jobTitle}`, 'pdf') };
  }

  // ─── Export DOCX ──────────────────────────────────────────────────────────

  async exportDocx(supabaseId: string, id: string): Promise<{ buffer: Buffer; filename: string }> {
    const userId = await this.resolveUserId(supabaseId);
    const cl     = await this.assertCLOwnership(id, userId);
    const buffer = await this.exporter.generateDocx({
      title:    `Cover Letter — ${cl.jobTitle} at ${cl.companyName}`,
      subtitle: cl.hiringManagerName ? `Addressed to ${cl.hiringManagerName}` : undefined,
      content:  cl.content,
    });
    return { buffer, filename: this.exporter.toFilename(`Cover_Letter_${cl.companyName}_${cl.jobTitle}`, 'docx') };
  }
}
