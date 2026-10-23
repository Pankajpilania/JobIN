import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  private supabase: SupabaseClient;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {
    const supabaseUrl =
      this.config.get<string>('NEXT_PUBLIC_SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const apiKey =
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      this.config.get<string>('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !apiKey) {
      this.logger.error(
        'Supabase configuration missing (NEXT_PUBLIC_SUPABASE_URL or Supabase API key)',
      );
    }

    this.supabase = createClient(supabaseUrl || '', apiKey || '');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser(token);
    if (error || !user) {
      throw new UnauthorizedException('Invalid or expired Supabase token');
    }

    const { dbUser, created } = await this.findOrCreateDbUser(user);

    if (created) {
      this.email.sendWelcome(dbUser.email, dbUser.fullName.split(' ')[0]).catch((err) => {
        this.logger.warn(`Failed to send welcome email: ${err.message}`);
      });
    }

    if (dbUser.status !== 'ACTIVE') {
      throw new ForbiddenException('This account is not active');
    }

    // Attach user to request payload
    request.user = {
      id: user.id,
      sub: user.id, // For backwards compatibility
      email: user.email,
      roles: dbUser.roles.map((r) => r.role.name),
      dbUser,
    };

    return true;
  }

  private async findOrCreateDbUser(user: {
    id: string;
    email?: string;
    email_confirmed_at?: string;
    user_metadata?: Record<string, unknown>;
  }) {
    const include = { roles: { include: { role: true } } };
    const linkedUser = await this.prisma.user.findUnique({
      where: { supabaseId: user.id },
      include,
    });
    if (linkedUser) return { dbUser: linkedUser, created: false };

    const email = user.email?.trim().toLowerCase() || `${user.id}@unknown.jobin`;
    const existingEmailUser = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include,
    });

    if (existingEmailUser) {
      if (existingEmailUser.supabaseId && existingEmailUser.supabaseId !== user.id) {
        throw new ConflictException('This email is already linked to another account.');
      }
      if (user.email && !user.email_confirmed_at) {
        throw new ForbiddenException('Confirm your email before linking this existing account.');
      }

      const dbUser = await this.prisma.user.update({
        where: { id: existingEmailUser.id },
        data: { supabaseId: user.id },
        include,
      });
      return { dbUser, created: false };
    }

    const fullName =
      (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
      (typeof user.user_metadata?.name === 'string' && user.user_metadata.name) ||
      email.split('@')[0];
    const avatarUrl =
      typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null;

    try {
      const dbUser = await this.prisma.user.create({
        data: {
          supabaseId: user.id,
          email,
          fullName,
          avatarUrl,
          status: 'ACTIVE',
        },
        include,
      });
      return { dbUser, created: true };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }

      const racedUser = await this.prisma.user.findUnique({
        where: { supabaseId: user.id },
        include,
      });
      if (racedUser) return { dbUser: racedUser, created: false };

      this.logger.warn(`User sync encountered a unique constraint conflict for ${user.id}`);
      throw new ConflictException(
        'An account with this email already exists. Please contact support.',
      );
    }
  }
}
