import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Supabase sync — upserts a user record based on their Supabase email.
   * Called by the SupabaseStrategy after JWT validation when the user
   * is new (i.e. not yet in Prisma).
   */
  async clerkSync(payload: {
    clerkId: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
  }) {
    if (!payload.email) {
      throw new BadRequestException('email is required');
    }

    // Try to find by email (clerkId is kept for backward compat but optional)
    let user = await this.prisma.user.findUnique({ where: { email: payload.email } });

    if (user) {
      // Update profile info
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          fullName: payload.fullName || user.fullName,
          avatarUrl: payload.avatarUrl || user.avatarUrl,
          lastLoginAt: new Date(),
        },
      });

      const withRelations = await this.prisma.user.findUnique({
        where: { id: user.id },
        include: { aiCredits: true, roles: { include: { role: true } } },
      });

      return {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        roles: withRelations?.roles.map((ur) => ur.role.name) ?? [],
        aiCredits: withRelations?.aiCredits ? (withRelations.aiCredits.totalCredits - withRelations.aiCredits.usedCredits) : 0,
        isNew: false,
      };
    }

    // Create new user
    const newUser = await this.prisma.user.create({
      data: {
        email: payload.email,
        fullName: payload.fullName || 'New User',
        avatarUrl: payload.avatarUrl,
        lastLoginAt: new Date(),
        aiCredits: { create: { totalCredits: 50, usedCredits: 0 } },
      },
      include: { aiCredits: true, roles: { include: { role: true } } },
    });

    this.logger.log(`Supabase-synced new user: ${newUser.email}`);

    return {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      status: newUser.status,
      roles: [],
      aiCredits: newUser.aiCredits ? (newUser.aiCredits.totalCredits - newUser.aiCredits.usedCredits) : 50,
      isNew: true,
    };
  }

  async getMe(userId: string) {
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
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      country: user.country,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      roles: user.roles.map((ur) => ur.role.name),
      aiCredits: user.aiCredits ? (user.aiCredits.totalCredits - user.aiCredits.usedCredits) : 0,
      activeSubscription: user.subscriptions[0]
        ? {
            planName: user.subscriptions[0].plan.name,
            status: user.subscriptions[0].status,
            currentPeriodEnd: user.subscriptions[0].currentPeriodEnd,
          }
        : null,
    };
  }
}
