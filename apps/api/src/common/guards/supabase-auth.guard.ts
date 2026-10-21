import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
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
    const supabaseUrl = this.config.get<string>('NEXT_PUBLIC_SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY') || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      this.logger.error('Supabase configuration missing (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
    }

    this.supabase = createClient(supabaseUrl || '', serviceRoleKey || '');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await this.supabase.auth.getUser(token);
    if (error || !user) {
      throw new UnauthorizedException('Invalid or expired Supabase token');
    }

    // Lazy user creation / sync
    let dbUser = await this.prisma.user.findUnique({
      where: { supabaseId: user.id },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!dbUser) {
      const email = user.email || `${user.id}@unknown.jobin`;
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0];
      const avatarUrl = user.user_metadata?.avatar_url || null;

      dbUser = await this.prisma.user.create({
        data: {
          supabaseId: user.id,
          email,
          fullName,
          avatarUrl,
          status: 'ACTIVE',
        },
        include: {
          roles: { include: { role: true } },
        },
      });

      // Send welcome email asynchronously
      this.email.sendWelcome(dbUser.email, dbUser.fullName.split(' ')[0]).catch((err) => {
        this.logger.warn(`Failed to send welcome email: ${err.message}`);
      });
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
}
