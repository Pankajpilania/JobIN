import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SupabaseUserPayload } from '../common/decorators/current-user.decorator';

const INTERVIEW_STATUSES = [
  'PHONE_SCREEN',
  'INTERVIEW',
  'TECHNICAL_ASSESSMENT',
  'FINAL_ROUND',
] as const;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(authUser: SupabaseUserPayload) {
    const user = authUser.dbUser;
    if (!user?.id) throw new NotFoundException('User profile not found.');

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [statusRows, thisWeek, activity, resume, subscription] = await Promise.all([
      this.prisma.jobApplication.groupBy({
        by: ['status'],
        where: { userId: user.id },
        _count: { _all: true },
      }),
      this.prisma.jobApplication.count({
        where: { userId: user.id, createdAt: { gte: weekAgo } },
      }),
      this.prisma.jobApplication.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          jobTitle: true,
          companyName: true,
          status: true,
          updatedAt: true,
          appliedDate: true,
          location: true,
        },
      }),
      this.prisma.resume.findFirst({
        where: { userId: user.id },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        select: { title: true, atsScore: true, isDefault: true },
      }),
      this.prisma.subscription.findFirst({
        where: { userId: user.id, status: 'ACTIVE' },
        include: {
          plan: {
            include: { features: { where: { featureKey: 'ai_credits_monthly' } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const row of statusRows) byStatus[row.status] = row._count._all;

    const total = statusRows.reduce((sum, row) => sum + row._count._all, 0);
    const totalApplied = total - (byStatus.SAVED ?? 0);
    const interviewCount = INTERVIEW_STATUSES.reduce((sum, status) => sum + (byStatus[status] ?? 0), 0);
    const offers = byStatus.OFFER ?? 0;
    const periodStart = subscription?.currentPeriodStart ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = subscription?.currentPeriodEnd ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const [usage, allowanceRow] = await Promise.all([
      this.prisma.aIUsage.aggregate({
        where: { userId: user.id, createdAt: { gte: periodStart, lt: periodEnd } },
        _sum: { creditUnits: true, totalTokens: true, estimatedCostUsd: true },
      }),
      subscription
        ? Promise.resolve(subscription.plan.features[0]?.value)
        : this.prisma.planFeature.findFirst({
            where: { featureKey: 'ai_credits_monthly', plan: { name: 'FREE' } },
            select: { value: true },
          }).then((feature) => feature?.value),
    ]);

    const parsedAllowance = Number.parseInt(allowanceRow ?? '20', 10);
    const creditsIncluded = Number.isFinite(parsedAllowance) ? parsedAllowance : 20;
    const creditsUsed = usage._sum.creditUnits ?? 0;

    return {
      user: { fullName: user.fullName },
      stats: {
        total,
        totalApplied,
        byStatus,
        interviewRate: totalApplied > 0 ? Math.round((interviewCount + offers) / totalApplied * 100) : 0,
        offerRate: totalApplied > 0 ? Math.round(offers / totalApplied * 100) : 0,
        thisWeek,
      },
      activity,
      resume,
      billing: {
        planName: subscription?.plan.name ?? 'FREE',
        creditsUsed,
        creditsIncluded: creditsIncluded < 0 ? null : creditsIncluded,
        creditsRemaining: creditsIncluded < 0 ? null : Math.max(creditsIncluded - creditsUsed, 0),
        totalTokens: usage._sum.totalTokens ?? 0,
        estimatedCostUsd: usage._sum.estimatedCostUsd ?? 0,
        periodStart,
        periodEnd,
        hasActiveSubscription: Boolean(subscription),
      },
    };
  }
}
