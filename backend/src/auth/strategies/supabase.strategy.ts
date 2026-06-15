import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase-jwt') {
  private readonly logger = new Logger(SupabaseStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('app.supabaseJwtSecret') || 'change-me-in-production',
    });
  }

  async validate(payload: any) {
    const supabaseId = payload.sub;
    const email = payload.email;

    if (!supabaseId) {
      throw new UnauthorizedException('Invalid JWT payload');
    }

    // Try to find the user in our DB by email or clerkId (as fallback)
    let user = null;
    if (email) {
      user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          roles: {
            include: { role: true },
          },
          aiCredits: true,
        },
      });
    }

    if (!user) {
      // Return a minimal payload allowing the auth sync endpoint to create the user
      return {
        id: supabaseId,
        clerkId: supabaseId, // Fallback reuse field
        email: email || '',
        roles: [],
        isNewUser: true,
      };
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Your account has been suspended');
    }

    if (user.status === 'DELETED') {
      throw new UnauthorizedException('Your account has been deleted');
    }

    return {
      id: user.id,
      clerkId: user.clerkId || supabaseId,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      roles: user.roles.map((ur) => ur.role.name),
      aiCredits: user.aiCredits?.remaining ?? 0,
    };
  }
}
