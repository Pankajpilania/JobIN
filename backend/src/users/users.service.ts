import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        aiCredits: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            resumes: true,
            jobApplications: true,
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
      country: user.country,
      avatarUrl: user.avatarUrl,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      roles: user.roles.map((ur) => ur.role.name),
      aiCredits: user.aiCredits ? (user.aiCredits.totalCredits - user.aiCredits.usedCredits) : 0,
      stats: {
        resumes: user._count.resumes,
        applications: user._count.jobApplications,
      },
      activeSubscription: user.subscriptions[0]
        ? {
            planName: user.subscriptions[0].plan.name,
            status: user.subscriptions[0].status,
            currentPeriodEnd: user.subscriptions[0].currentPeriodEnd,
          }
        : null,
    };
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      country: updated.country,
      avatarUrl: updated.avatarUrl,
      status: updated.status,
      updatedAt: updated.updatedAt,
    };
  }

  async getCredits(userId: string) {
    const credits = await this.prisma.aICredits.findUnique({
      where: { userId },
    });

    return {
      remaining: credits ? (credits.totalCredits - credits.usedCredits) : 0,
      updatedAt: credits?.updatedAt,
    };
  }

  async softDelete(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'DELETED' },
    });

    return { message: 'Account deleted successfully' };
  }
}
