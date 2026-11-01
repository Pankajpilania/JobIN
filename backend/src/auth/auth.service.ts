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
import * as crypto from 'crypto';

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

  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
      .toString('hex');

    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, passwordHash?: string | null): boolean {
    if (!password || !passwordHash || !passwordHash.includes(':')) {
      return false;
    }

    const [salt, hash] = passwordHash.split(':');
    if (!salt || !hash) {
      return false;
    }

    const derivedHash = crypto
      .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
      .toString('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(hash, 'hex'),
        Buffer.from(derivedHash, 'hex'),
      );
    } catch {
      return false;
    }
  }

  private getRoleNames(roles: any[] | undefined): string[] {
    if (!Array.isArray(roles)) {
      return [];
    }

    return roles
      .map((entry) => entry?.role?.name ?? entry?.name)
      .filter((name): name is string => Boolean(name));
  }

  private getAiCreditsValue(user: any): number {
    if (!user) {
      return 0;
    }

    if (typeof user.aiCredits?.remaining === 'number') {
      return user.aiCredits.remaining;
    }

    if (user.aiCredits) {
      const totalCredits = Number(user.aiCredits.totalCredits ?? 0);
      const usedCredits = Number(user.aiCredits.usedCredits ?? 0);
      return totalCredits - usedCredits;
    }

    return 0;
  }

  async register(dto: { email: string; password: string; fullName?: string }) {
    const email = dto.email?.trim().toLowerCase();
    const password = dto.password?.trim();

    if (!email || !password) {
      throw new BadRequestException('email and password are required');
    }

    if (password.length < 8) {
      throw new BadRequestException('password must be at least 8 characters long');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const user = (await this.prisma.user.create({
      data: {
        email,
        fullName: dto.fullName?.trim() || 'New User',
        passwordHash: this.hashPassword(password),
        status: 'ACTIVE',
        lastLoginAt: new Date(),
        aiCredits: { create: { remaining: 50 } },
      } as any,
      include: { aiCredits: true, roles: { include: { role: true } } },
    })) as any;

    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        roles: this.getRoleNames(user.roles),
        aiCredits: this.getAiCreditsValue(user),
      },
    };
  }

  async login(dto: { email: string; password: string }) {
    const email = dto.email?.trim().toLowerCase();
    const password = dto.password?.trim();

    if (!email || !password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = (await this.prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } }, aiCredits: true },
    })) as any;

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === 'SUSPENDED' || user.status === 'DELETED') {
      throw new UnauthorizedException('Account is suspended');
    }

    if (!this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const updatedUser = (await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
      include: { roles: { include: { role: true } }, aiCredits: true },
    }).catch(() => user)) as any;

    const accessToken = this.jwtService.sign({ sub: updatedUser.id, email: updatedUser.email });

    return {
      accessToken,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        status: updatedUser.status,
        roles: this.getRoleNames(updatedUser.roles),
        aiCredits: this.getAiCreditsValue(updatedUser),
      },
    };
  }

}