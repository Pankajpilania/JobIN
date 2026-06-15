import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService }  from '../email/email.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AccountStatus } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // ─── Lazy creation / sync ──────────────────────────────────────────────────

  async findOrCreateFromSupabase(
    supabaseId: string,
    email: string,
    fullName?: string,
    avatarUrl?: string,
  ) {
    let user = await this.prisma.user.findUnique({
      where: { supabaseId },
      include: {
        roles: { include: { role: true } },
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      // Create user if not exists
      const name = fullName || email.split('@')[0];
      user = await this.prisma.user.create({
        data: {
          supabaseId,
          email,
          fullName: name,
          avatarUrl: avatarUrl || null,
          status: AccountStatus.ACTIVE,
        },
        include: {
          roles: { include: { role: true } },
          subscriptions: {
            where: { status: 'ACTIVE' },
            include: { plan: true },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      // Send welcome email asynchronously
      this.email.sendWelcome(user.email, user.fullName.split(' ')[0]).catch((err) => {
        this.logger.warn(`Welcome email failed: ${err.message}`);
      });
    }

    return user;
  }

  // ─── Get by Supabase ID ────────────────────────────────────────────────────

  async findBySupabaseId(supabaseId: string) {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      include: {
        roles: {
          include: { role: true },
        },
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ─── Get by internal DB ID ─────────────────────────────────────────────────

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ─── Update profile by Supabase ID ──────────────────────────────────────────

  async updateBySupabaseId(supabaseId: string, dto: UpdateUserDto) {
    await this.findBySupabaseId(supabaseId); // throws 404 if not found

    return this.prisma.user.update({
      where: { supabaseId },
      data: {
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        updatedAt: new Date(),
      },
    });
  }

  // ─── Soft delete ────────────────────────────────────────────────────────────

  async softDelete(supabaseId: string) {
    await this.findBySupabaseId(supabaseId); // throws 404 if not found

    return this.prisma.user.update({
      where: { supabaseId },
      data: {
        status: AccountStatus.DELETED,
        email: `deleted_${Date.now()}_${supabaseId}@jobin.deleted`,
      },
    });
  }
}
