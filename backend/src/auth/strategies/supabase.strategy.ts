import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

import { passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase-jwt') {
  private readonly logger = new Logger(SupabaseStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || configService.get<string>('NEXT_PUBLIC_SUPABASE_URL');
    const symmetricSecret = configService.get<string>('app.supabaseJwtSecret') || 'change-me-in-production';

    const jwksSecretProvider = supabaseUrl
      ? passportJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
          jwksUri: `${supabaseUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`,
        })
      : null;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['HS256', 'ES256', 'RS256'],
      secretOrKeyProvider: (request, rawJwtToken, done) => {
        try {
          const parts = rawJwtToken.split('.');
          if (parts.length < 2) {
            return done(new Error('Invalid token structure'));
          }
          const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
          if (header.kid && jwksSecretProvider) {
            jwksSecretProvider(request, rawJwtToken, done);
          } else {
            done(null, symmetricSecret);
          }
        } catch (err: any) {
          done(err);
        }
      },
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
