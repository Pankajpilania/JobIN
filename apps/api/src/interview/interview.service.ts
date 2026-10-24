import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { extractTextFromBuffer } from '../common/utils/text-extractor';
import { S3Service } from '../s3/s3.service';

const PLAN_CREDIT_FEATURE = 'ai_credits_monthly';

@Injectable()
export class InterviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AIService,
    private readonly s3: S3Service,
  ) {}

  private async getOwnedResumeText(userId: string, resumeId: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { id: resumeId, user: { supabaseId: userId } },
      select: { id: true, parsedText: true, s3Key: true, mimeType: true },
    });
    if (!resume) throw new NotFoundException('Resume not found.');

    let text = resume.parsedText ?? '';
    if (text.length < 50) {
      const buffer = await this.s3.downloadFile(resume.s3Key);
      text = await extractTextFromBuffer(buffer, resume.mimeType);
      if (text.length >= 50) {
        await this.prisma.resume.update({ where: { id: resume.id }, data: { parsedText: text } });
      }
    }
    if (!text) throw new BadRequestException('Could not read text from this resume.');
    return text;
  }

  private async getCreditStatus(userId: string) {
    const now = new Date();
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { plan: { include: { features: { where: { featureKey: PLAN_CREDIT_FEATURE } } } } },
      orderBy: { createdAt: 'desc' },
    });
    const periodStart =
      subscription?.currentPeriodStart ??
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd =
      subscription?.currentPeriodEnd ??
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const allowanceValue =
      subscription?.plan.features[0]?.value ??
      (
        await this.prisma.planFeature.findFirst({
          where: { featureKey: PLAN_CREDIT_FEATURE, plan: { name: 'FREE' } },
          select: { value: true },
        })
      )?.value ??
      '20';
    const allowance = Number.parseInt(allowanceValue, 10);
    const usage = await this.prisma.aIUsage.aggregate({
      where: { userId, createdAt: { gte: periodStart, lt: periodEnd } },
      _sum: { creditUnits: true },
    });
    const used = usage._sum.creditUnits ?? 0;
    return {
      allowance: Number.isFinite(allowance) ? allowance : 20,
      remaining: allowance < 0 ? null : Math.max(allowance - used, 0),
    };
  }

  private async recordUsage(
    userId: string,
    resumeId: string,
    usage: {
      modelName: string;
      feature: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCostUsd: number;
      tier?: string;
    },
    creditUnits: number,
  ) {
    await this.prisma.aIUsage.create({
      data: { userId, resumeId, ...usage, creditUnits },
    });
  }

  async generateQuestion(
    supabaseId: string,
    dto: { resumeId: string; roleTitle: string; companyName: string; previousQuestions?: string[] },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User profile not found.');

    const creditStatus = await this.getCreditStatus(user.id);
    if (creditStatus.remaining === 0) {
      throw new BadRequestException('You have no AI credits remaining this month.');
    }

    const resumeText = await this.getOwnedResumeText(supabaseId, dto.resumeId);
    const generated = await this.ai.generateInterviewQuestion({
      resumeText,
      roleTitle: dto.roleTitle,
      companyName: dto.companyName,
      previousQuestions: dto.previousQuestions ?? [],
    });
    await this.recordUsage(user.id, dto.resumeId, generated.usage, 1);

    return {
      question: generated.question,
      creditsRemaining: creditStatus.remaining === null ? null : creditStatus.remaining - 1,
    };
  }

  async evaluateAnswer(
    supabaseId: string,
    dto: {
      resumeId: string;
      roleTitle: string;
      companyName: string;
      question: string;
      answer: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User profile not found.');
    const resumeText = await this.getOwnedResumeText(supabaseId, dto.resumeId);
    const evaluated = await this.ai.evaluateInterviewAnswer({ ...dto, resumeText });
    await this.recordUsage(user.id, dto.resumeId, evaluated.usage, 0);
    return {
      score: evaluated.score,
      evaluation: evaluated.evaluation,
      strengths: evaluated.strengths,
      improvements: evaluated.improvements,
    };
  }
}
