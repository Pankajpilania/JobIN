import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import type { ListUsersDto, AdminUpdateUserDto, SendNotificationDto, ListSubscriptionsDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email:  EmailService,
  ) {}

  // ─── Audit logging ────────────────────────────────────────────────────────

  async audit(
    adminId:      string,
    action:       string,
    targetEntity: string,
    targetId?:    string,
    beforeState?: object,
    afterState?:  object,
    metadata?:    object,
    ipAddress?:   string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId:       adminId,
        action,
        targetEntity,
        targetId:     targetId ?? null,
        beforeState:  beforeState ? (beforeState as any) : undefined,
        afterState:   afterState  ? (afterState  as any) : undefined,
        metadata:     metadata    ? (metadata    as any) : undefined,
        ipAddress:    ipAddress   ?? 'unknown',
      },
    }).catch(err => this.logger.error('Audit log failed', err));
  }

  // ─── Dashboard metrics ────────────────────────────────────────────────────

  async getMetrics() {
    const now   = new Date();
    const ago30 = new Date(now.getTime() - 30 * 86_400_000);
    const ago7  = new Date(now.getTime() -  7 * 86_400_000);

    const [
      totalUsers,
      activeUsers,
      newUsersMonth,
      suspendedUsers,
      totalResumes,
      totalApplications,
      totalAIRequests,
      aiCostAggregate,
      activeSubscriptions,
      cancelledMonth,
      allActiveSubs,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE', lastLoginAt: { gte: ago30 } } }),
      this.prisma.user.count({ where: { createdAt: { gte: ago30 } } }),
      this.prisma.user.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.resume.count(),
      this.prisma.jobApplication.count(),
      this.prisma.aIUsage.count(),
      this.prisma.aIUsage.aggregate({ _sum: { estimatedCostUsd: true, totalTokens: true } }),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.subscription.count({ where: { status: 'CANCELLED', updatedAt: { gte: ago30 } } }),
      this.prisma.subscription.findMany({
        where:   { status: 'ACTIVE' },
        include: { plan: true },
      }),
    ]);

    // MRR = sum of all active subscription monthly prices
    const mrr = allActiveSubs.reduce((sum, sub) => sum + (sub.plan?.priceMonthly ?? 0), 0);
    const arr = mrr * 12;

    // Churn rate = cancelled in last 30d / (active + cancelled in last 30d)
    const churnDenominator = activeSubscriptions + cancelledMonth;
    const churnRate = churnDenominator > 0
      ? Math.round((cancelledMonth / churnDenominator) * 100 * 10) / 10
      : 0;

    // User growth last 7 days (grouped by day)
    const userGrowth = await this.prisma.$queryRaw<{ day: string; count: number }[]>`
      SELECT DATE_TRUNC('day', "createdAt")::date AS day, COUNT(*)::int AS count
      FROM "User"
      WHERE "createdAt" >= ${ago7}
      GROUP BY day ORDER BY day ASC
    `;

    // Revenue last 6 months (grouped by month)
    const revenueByMonth = await this.prisma.$queryRaw<{ month: string; revenue: number }[]>`
      SELECT TO_CHAR(DATE_TRUNC('month', p."createdAt"), 'Mon YYYY') AS month,
             SUM(p.amount)::float AS revenue
      FROM "Payment" p
      WHERE p."createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', p."createdAt")
      ORDER BY DATE_TRUNC('month', p."createdAt") ASC
    `.catch(() => []);

    return {
      totalUsers,
      activeUsers,
      newUsersMonth,
      suspendedUsers,
      totalResumes,
      totalApplications,
      totalAIRequests,
      totalTokensUsed:      aiCostAggregate._sum.totalTokens      ?? 0,
      totalAICostUsd:       Math.round((aiCostAggregate._sum.estimatedCostUsd ?? 0) * 100) / 100,
      activeSubscriptions,
      mrr:                  Math.round(mrr * 100) / 100,
      arr:                  Math.round(arr * 100) / 100,
      churnRate,
      userGrowth,
      revenueByMonth,
    };
  }

  // ─── Users ───────────────────────────────────────────────────────────────

  async listUsers(dto: ListUsersDto) {
    const page  = dto.page  ?? 1;
    const limit = dto.limit ?? 25;
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (dto.status) where.status = dto.status;
    if (dto.search) {
      where.OR = [
        { email:    { contains: dto.search, mode: 'insensitive' } },
        { fullName: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = { [dto.sortBy ?? 'createdAt']: dto.sortDir ?? 'desc' };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take:    limit,
        orderBy,
        include: {
          roles:         { include: { role: true } },
          subscriptions: { include: { plan: true }, where: { status: 'ACTIVE' }, take: 1 },
          _count:        { select: { resumes: true, jobApplications: true, aiUsage: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUserActivity(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const [resumes, aiUsage, applications, auditLogs] = await Promise.all([
      this.prisma.resume.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.aIUsage.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      this.prisma.jobApplication.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.auditLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30 }),
    ]);

    const totalTokens  = aiUsage.reduce((s, u) => s + u.totalTokens,      0);
    const totalCostUsd = aiUsage.reduce((s, u) => s + u.estimatedCostUsd, 0);

    return { user, resumes, aiUsage, applications, auditLogs, totalTokens, totalCostUsd: Math.round(totalCostUsd * 100) / 100 };
  }

  async updateUser(adminId: string, userId: string, dto: AdminUpdateUserDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where:   { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('User not found');

    const beforeState = { status: user.status, roles: user.roles.map(r => r.role.name) };

    // Status change
    if (dto.status) {
      await this.prisma.user.update({ where: { id: userId }, data: { status: dto.status as any } });
    }

    // Grant AI credits
    if (dto.grantCredits !== undefined && dto.grantCredits > 0) {
      await this.prisma.aICredits.upsert({
        where:  { userId },
        create: { userId, totalCredits: dto.grantCredits, grantedBy: adminId },
        update: { totalCredits: { increment: dto.grantCredits }, grantedBy: adminId },
      });
    }

    // Assign role
    if (dto.role) {
      const role = await this.prisma.role.findFirst({ where: { name: dto.role } });
      if (role) {
        await this.prisma.userRole.upsert({
          where:  { userId_roleId: { userId, roleId: role.id } },
          create: { userId, roleId: role.id },
          update: {},
        });
      }
    }

    const afterState = { status: dto.status ?? user.status, grantedCredits: dto.grantCredits, assignedRole: dto.role };

    await this.audit(adminId, 'ADMIN_UPDATE_USER', 'User', userId, beforeState, afterState, { note: dto.note }, ipAddress);

    return this.prisma.user.findUnique({
      where:   { id: userId },
      include: { roles: { include: { role: true } }, subscriptions: { include: { plan: true } } },
    });
  }

  // ─── Subscriptions ────────────────────────────────────────────────────────

  async listSubscriptions(dto: ListSubscriptionsDto) {
    const page  = dto.page  ?? 1;
    const limit = dto.limit ?? 25;
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (dto.status) where.status = dto.status;

    const [subs, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user:     { select: { id: true, email: true, fullName: true, avatarUrl: true } },
          plan:     true,
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      data: subs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Billing ─────────────────────────────────────────────────────────────

  async getBilling() {
    const ago6m = new Date(Date.now() - 180 * 86_400_000);

    const [recentPayments, totalRevAggregate, subsByStatus, topPlans] = await Promise.all([
      this.prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take:    50,
        include: {
          subscription: {
            include: { user: { select: { email: true, fullName: true } }, plan: true },
          },
        },
      }),
      this.prisma.payment.aggregate({
        where:  { status: 'succeeded' },
        _sum:   { amount: true },
        _count: { id: true },
      }),
      this.prisma.subscription.groupBy({
        by:    ['status'],
        _count: { id: true },
      }),
      this.prisma.plan.findMany({
        include: { _count: { select: { subscriptions: true } } },
        where:   { subscriptions: { some: { status: 'ACTIVE' } } },
      }),
    ]);

    // Revenue by month (raw SQL)
    const revenueByMonth = await this.prisma.$queryRaw<{ month: string; revenue: number; count: number }[]>`
      SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon YYYY') AS month,
             SUM(amount)::float AS revenue,
             COUNT(*)::int AS count
      FROM "Payment"
      WHERE status = 'succeeded' AND "createdAt" >= ${ago6m}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY DATE_TRUNC('month', "createdAt") ASC
    `.catch(() => []);

    return {
      recentPayments,
      totalRevenue:  Math.round((totalRevAggregate._sum.amount ?? 0) * 100) / 100,
      totalPayments: totalRevAggregate._count.id,
      subsByStatus,
      topPlans,
      revenueByMonth,
    };
  }

  // ─── AI usage ─────────────────────────────────────────────────────────────

  async getAIUsage() {
    const ago30 = new Date(Date.now() - 30 * 86_400_000);

    const [byModel, byFeature, byDay, topUsers] = await Promise.all([
      // Tokens by model
      this.prisma.aIUsage.groupBy({
        by:      ['modelName'],
        _sum:    { totalTokens: true, estimatedCostUsd: true },
        _count:  { id: true },
        orderBy: { _sum: { totalTokens: 'desc' } },
      }),
      // Requests by feature
      this.prisma.aIUsage.groupBy({
        by:      ['feature'],
        _count:  { id: true },
        _sum:    { totalTokens: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      // Tokens by day last 30 days
      this.prisma.$queryRaw<{ day: string; tokens: number; cost: number }[]>`
        SELECT DATE_TRUNC('day', "createdAt")::date AS day,
               SUM("totalTokens")::int AS tokens,
               SUM("estimatedCostUsd")::float AS cost
        FROM "AIUsage"
        WHERE "createdAt" >= ${ago30}
        GROUP BY day ORDER BY day ASC
      `.catch(() => []),
      // Top users by token usage
      this.prisma.aIUsage.groupBy({
        by:      ['userId'],
        _sum:    { totalTokens: true, estimatedCostUsd: true },
        _count:  { id: true },
        orderBy: { _sum: { totalTokens: 'desc' } },
        take:    10,
      }),
    ]);

    // Enrich top users with email
    const topUserIds = topUsers.map(u => u.userId);
    const users = await this.prisma.user.findMany({
      where:  { id: { in: topUserIds } },
      select: { id: true, email: true, fullName: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    return {
      byModel,
      byFeature,
      byDay,
      topUsers: topUsers.map(u => ({ ...u, user: userMap[u.userId] })),
      totals: {
        requests:  await this.prisma.aIUsage.count(),
        tokens:    (await this.prisma.aIUsage.aggregate({ _sum: { totalTokens: true } }))._sum.totalTokens ?? 0,
        costUsd:   Math.round(((await this.prisma.aIUsage.aggregate({ _sum: { estimatedCostUsd: true } }))._sum.estimatedCostUsd ?? 0) * 100) / 100,
      },
    };
  }

  // ─── Support tickets ──────────────────────────────────────────────────────

  async listTickets(status?: string, page = 1, limit = 25) {
    const skip  = (page - 1) * limit;
    const where: any = status ? { status } : {};

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user:      { select: { id: true, email: true, fullName: true, avatarUrl: true } },
          responses: { orderBy: { createdAt: 'desc' }, take: 1 },
          _count:    { select: { responses: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return { data: tickets, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async updateTicket(
    adminId:  string,
    ticketId: string,
    status:   string,
    assignedTo?: string,
    ipAddress?:  string,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data:  {
        status:     status as any,
        assignedTo: assignedTo,
        resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : undefined,
      },
    });

    await this.audit(adminId, 'ADMIN_UPDATE_TICKET', 'SupportTicket', ticketId,
      { status: ticket.status }, { status: updated.status }, undefined, ipAddress);

    return updated;
  }

  async replyToTicket(adminId: string, ticketId: string, content: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where:   { id: ticketId },
      include: { user: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const response = await this.prisma.ticketResponse.create({
      data: { ticketId, authorId: adminId, content, isAdmin: true },
    });

    // Email the user
    await this.email.sendSupportReply(ticket.user.email, ticket.user.fullName, ticket.subject, content);

    return response;
  }

  // ─── Notifications / email campaign ──────────────────────────────────────

  async sendNotification(adminId: string, dto: SendNotificationDto, ipAddress?: string) {
    let userIds: string[] = [];

    if (dto.userId) {
      userIds = [dto.userId];
    } else {
      // Resolve audience to user IDs
      const where: any = {};
      if (dto.audience === 'ACTIVE')   where.status = 'ACTIVE';
      if (dto.audience === 'SUSPENDED') where.status = 'SUSPENDED';
      if (dto.audience === 'PREMIUM') {
        where.subscriptions = { some: { status: 'ACTIVE' } };
      }
      if (dto.audience === 'CHURNED') {
        where.subscriptions = { some: { status: 'CANCELLED' } };
      }
      const users = await this.prisma.user.findMany({ where, select: { id: true } });
      userIds = users.map(u => u.id);
    }

    // Bulk create notification records
    await this.prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        type:    (dto.type as any) ?? 'EMAIL',
        subject: dto.subject,
        content: dto.content,
        sentAt:  new Date(),
      })),
      skipDuplicates: true,
    });

    // Send email if type is EMAIL
    if (dto.type !== 'IN_APP') {
      const users = await this.prisma.user.findMany({
        where:  { id: { in: userIds } },
        select: { email: true, fullName: true },
      });
      await Promise.allSettled(
        users.map(u => this.email.sendCampaign(u.email, u.fullName, dto.subject, dto.content)),
      );
    }

    await this.audit(adminId, 'ADMIN_SEND_NOTIFICATION', 'Notification', undefined,
      undefined, { audience: dto.audience, userCount: userIds.length }, undefined, ipAddress);

    return { sent: userIds.length, subject: dto.subject };
  }
}
