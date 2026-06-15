import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SuspendUserDto } from './dto/suspend-user.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async writeAuditLog(
    adminId: string,
    action: string,
    targetEntity: string,
    beforeState?: any,
    afterState?: any,
    ipAddress = '0.0.0.0',
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        ipAddress,
        action,
        targetEntity,
        beforeState,
        afterState,
      },
    });
  }

  async listUsers(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          roles: { include: { role: true } },
          aiCredits: true,
          _count: {
            select: {
              resumes: true,
              jobApplications: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        status: u.status,
        country: u.country,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
        roles: u.roles.map((ur) => ur.role.name),
        aiCredits: u.aiCredits ? (u.aiCredits.totalCredits - u.aiCredits.usedCredits) : 0,
        stats: {
          resumes: u._count.resumes,
          applications: u._count.jobApplications,
        },
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDetails(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
        aiCredits: true,
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            resumes: true,
            jobApplications: true,
            supportTickets: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      supabaseId: user.supabaseId,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      country: user.country,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      roles: user.roles.map((ur) => ur.role.name),
      aiCredits: user.aiCredits ? (user.aiCredits.totalCredits - user.aiCredits.usedCredits) : 0,
      subscriptions: user.subscriptions.map((s) => ({
        id: s.id,
        planName: s.plan.name,
        status: s.status,
        currentPeriodStart: s.currentPeriodStart,
        currentPeriodEnd: s.currentPeriodEnd,
        cancelAtPeriodEnd: s.cancelAtPeriodEnd,
        createdAt: s.createdAt,
      })),
      stats: {
        resumes: user._count.resumes,
        applications: user._count.jobApplications,
        tickets: user._count.supportTickets,
      },
    };
  }

  async suspendUser(adminId: string, targetUserId: string, dto: SuspendUserDto, ipAddress = '0.0.0.0') {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const beforeState = { status: user.status };

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: 'SUSPENDED' },
    });

    await this.writeAuditLog(
      adminId,
      'USER_SUSPENDED',
      `User:${targetUserId}`,
      beforeState,
      { status: 'SUSPENDED', reason: dto.reason, durationDays: dto.durationDays },
      ipAddress,
    );

    this.logger.log(`Admin ${adminId} suspended user ${targetUserId}. Reason: ${dto.reason}`);

    return {
      id: updated.id,
      email: updated.email,
      status: updated.status,
      message: `User suspended successfully. Reason: ${dto.reason}`,
    };
  }

  async activateUser(adminId: string, targetUserId: string, ipAddress = '0.0.0.0') {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const beforeState = { status: user.status };

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: 'ACTIVE' },
    });

    await this.writeAuditLog(
      adminId,
      'USER_ACTIVATED',
      `User:${targetUserId}`,
      beforeState,
      { status: 'ACTIVE' },
      ipAddress,
    );

    this.logger.log(`Admin ${adminId} activated user ${targetUserId}`);

    return {
      id: updated.id,
      email: updated.email,
      status: updated.status,
      message: 'User activated successfully',
    };
  }

  async assignCredits(
    adminId: string,
    targetUserId: string,
    amount: number,
    ipAddress = '0.0.0.0',
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { aiCredits: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const beforeCredits = user.aiCredits ? (user.aiCredits.totalCredits - user.aiCredits.usedCredits) : 0;

    let credits;
    if (user.aiCredits) {
      credits = await this.prisma.aICredits.update({
        where: { userId: targetUserId },
        data: { totalCredits: { increment: amount } },
      });
    } else {
      credits = await this.prisma.aICredits.create({
        data: { userId: targetUserId, totalCredits: amount, usedCredits: 0 },
      });
    }

    await this.writeAuditLog(
      adminId,
      'CREDITS_ASSIGNED',
      `User:${targetUserId}`,
      { aiCredits: beforeCredits },
      { aiCredits: credits.totalCredits - credits.usedCredits, added: amount },
      ipAddress,
    );

    this.logger.log(`Admin ${adminId} assigned ${amount} credits to user ${targetUserId}`);

    return {
      userId: targetUserId,
      previousCredits: beforeCredits,
      addedCredits: amount,
      currentCredits: credits.totalCredits - credits.usedCredits,
    };
  }

  async getMetrics() {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalResumes,
      totalApplications,
      totalSubscriptions,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.resume.count(),
      this.prisma.jobApplication.count(),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    ]);

    const newUsersLast30Days = await this.prisma.user.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        newLast30Days: newUsersLast30Days,
      },
      content: {
        totalResumes,
        totalApplications,
      },
      billing: {
        activeSubscriptions: totalSubscriptions,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
