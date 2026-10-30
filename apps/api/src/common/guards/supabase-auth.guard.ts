import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import {
  createLocalJWKSet,
  createRemoteJWKSet,
  decodeJwt,
  decodeProtectedHeader,
  jwtVerify,
} from 'jose';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { OciJwksService } from '../../oci-auth/oci-jwks.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  private supabase: SupabaseClient;
  private auth0Jwks?: ReturnType<typeof createRemoteJWKSet>;
  private readonly authProvider: string;
  private readonly auth0Issuer?: string;
  private readonly auth0Audience?: string;
  private readonly ociIssuer?: string;
  private readonly ociAudience?: string;
  private readonly ociScope?: string;
  private readonly ociScopePath?: string;
  private readonly ociUserinfoUrl?: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    @Optional() private readonly ociJwksService?: OciJwksService,
  ) {
    this.authProvider =
      this.config.get<string>('AUTH_PROVIDER')?.trim().toLowerCase() || 'supabase';
    if (this.authProvider === 'auth0' || this.authProvider === 'dual') {
      const domain = this.config
        .get<string>('AUTH0_DOMAIN')
        ?.trim()
        .replace(/^https?:\/\//i, '')
        .replace(/\/+$/, '');
      this.auth0Audience = this.config.get<string>('AUTH0_AUDIENCE')?.trim();
      if (!domain || !this.auth0Audience) {
        throw new Error(
          'AUTH0_DOMAIN and AUTH0_AUDIENCE are required when AUTH_PROVIDER is auth0 or dual',
        );
      }

      this.auth0Issuer = `https://${domain}/`;
      this.auth0Jwks = createRemoteJWKSet(new URL('.well-known/jwks.json', this.auth0Issuer));
      if (this.authProvider === 'auth0') return;
    }
    if (this.authProvider === 'oci' || this.authProvider === 'oci_dual') {
      const issuer = this.config.get<string>('OCI_ISSUER')?.trim();
      const jwksUrl = this.config.get<string>('OCI_JWKS_URL')?.trim();
      this.ociAudience = this.config.get<string>('OCI_API_AUDIENCE')?.trim();
      this.ociScope = this.config.get<string>('OCI_API_SCOPE')?.trim();
      this.ociUserinfoUrl = this.config.get<string>('OCI_USERINFO_URL')?.trim();
      if (!issuer || !jwksUrl || !this.ociAudience || !this.ociScope || !this.ociUserinfoUrl) {
        throw new Error(
          'OCI_ISSUER, OCI_JWKS_URL, OCI_API_AUDIENCE, OCI_API_SCOPE, and OCI_USERINFO_URL are required when AUTH_PROVIDER is oci or oci_dual',
        );
      }
      this.ociIssuer = issuer;
      new URL(jwksUrl);
      try {
        const audienceUrl = new URL(this.ociAudience);
        const scopeUrl = new URL(this.ociScope);
        if (
          audienceUrl.protocol !== 'https:' ||
          scopeUrl.protocol !== 'https:' ||
          scopeUrl.origin !== audienceUrl.origin ||
          scopeUrl.pathname === '/' ||
          scopeUrl.username ||
          scopeUrl.password ||
          scopeUrl.search ||
          scopeUrl.hash
        ) {
          throw new Error();
        }
        this.ociScopePath = scopeUrl.pathname;
      } catch {
        throw new Error('OCI_API_SCOPE must be an HTTPS scope URI under OCI_API_AUDIENCE');
      }
      if (this.authProvider === 'oci') return;
    }

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
    if (this.authProvider === 'oci') {
      return this.activateOciUser(token, request);
    }
    if (this.authProvider === 'oci_dual') {
      try {
        if (decodeJwt(token).iss === this.ociIssuer) {
          return this.activateOciUser(token, request);
        }
      } catch {
        // Invalid tokens continue to Supabase validation and are rejected there.
      }
    }
    if (this.authProvider === 'auth0') {
      return this.activateAuth0User(token, request);
    }
    if (this.authProvider === 'dual') {
      try {
        if (decodeJwt(token).iss === this.auth0Issuer) {
          return this.activateAuth0User(token, request);
        }
      } catch {
        // Invalid tokens continue to Supabase validation and are rejected there.
      }
    }

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
      id: dbUser.supabaseId || user.id,
      sub: dbUser.supabaseId || user.id, // For backwards compatibility
      email: user.email,
      roles: dbUser.roles.map((r) => r.role.name),
      dbUser,
    };

    return true;
  }

  private async activateAuth0User(token: string, request: any): Promise<boolean> {
    let payload;
    try {
      ({ payload } = await jwtVerify(token, this.auth0Jwks!, {
        issuer: this.auth0Issuer,
        audience: this.auth0Audience,
        algorithms: ['RS256'],
      }));
    } catch {
      throw new UnauthorizedException('Invalid or expired Auth0 access token');
    }

    const subject = payload.sub;
    const email = payload['https://jobin.today/email'];
    const emailVerified = payload['https://jobin.today/email_verified'];
    const fullName = payload['https://jobin.today/name'];
    const avatarUrl = payload['https://jobin.today/picture'];

    if (typeof subject !== 'string' || !subject) {
      throw new UnauthorizedException('Auth0 access token is missing a subject');
    }
    if (emailVerified !== true) {
      throw new ForbiddenException('Verify your email with Auth0 before using JobIN.');
    }
    if (typeof email !== 'string' || !email.trim()) {
      throw new ForbiddenException('Your Auth0 profile must include a verified email address.');
    }

    const { dbUser, created } = await this.findOrCreateAuth0DbUser({
      subject,
      email,
      fullName: typeof fullName === 'string' ? fullName : undefined,
      avatarUrl: typeof avatarUrl === 'string' ? avatarUrl : undefined,
    });

    if (created) {
      this.email.sendWelcome(dbUser.email, dbUser.fullName.split(' ')[0]).catch((err) => {
        this.logger.warn(`Failed to send welcome email: ${err.message}`);
      });
    }
    if (dbUser.status !== 'ACTIVE') {
      throw new ForbiddenException('This account is not active');
    }

    request.user = {
      id: dbUser.supabaseId || subject,
      sub: subject,
      auth0Sub: subject,
      email: dbUser.email,
      roles: dbUser.roles.map((r) => r.role.name),
      dbUser,
    };
    return true;
  }

  private async findOrCreateAuth0DbUser(user: {
    subject: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
  }) {
    const include = { roles: { include: { role: true } } };
    const linkedUser = await this.prisma.user.findUnique({
      where: { auth0Sub: user.subject },
      include,
    });
    if (linkedUser) {
      if (linkedUser.supabaseId) return { dbUser: linkedUser, created: false };
      const dbUser = await this.prisma.user.update({
        where: { id: linkedUser.id },
        data: { supabaseId: user.subject },
        include,
      });
      return { dbUser, created: false };
    }

    const email = user.email.trim().toLowerCase();
    const existingEmailUser = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include,
    });
    if (existingEmailUser?.auth0Sub && existingEmailUser.auth0Sub !== user.subject) {
      throw new ConflictException('This email is already linked to another Auth0 account.');
    }

    if (existingEmailUser) {
      const dbUser = await this.prisma.user.update({
        where: { id: existingEmailUser.id },
        data: {
          auth0Sub: user.subject,
          ...(existingEmailUser.supabaseId ? {} : { supabaseId: user.subject }),
        },
        include,
      });
      return { dbUser, created: false };
    }

    try {
      const dbUser = await this.prisma.user.create({
        data: {
          auth0Sub: user.subject,
          supabaseId: user.subject,
          email,
          fullName: user.fullName?.trim() || email.split('@')[0],
          avatarUrl: user.avatarUrl || null,
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
        where: { auth0Sub: user.subject },
        include,
      });
      if (racedUser) return { dbUser: racedUser, created: false };

      this.logger.warn(
        `Auth0 user sync encountered a unique constraint conflict for ${user.subject}`,
      );
      throw new ConflictException(
        'An account with this email already exists. Please contact support.',
      );
    }
  }

  private async activateOciUser(token: string, request: any): Promise<boolean> {
    if (!this.ociJwksService) {
      throw new ServiceUnavailableException('OCI signing-key service is unavailable.');
    }
    let header;
    try {
      header = decodeProtectedHeader(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired OCI access token');
    }
    let jwks = await this.ociJwksService.getJwks();
    let payload;
    try {
      ({ payload } = await jwtVerify(token, createLocalJWKSet(jwks), {
        issuer: this.ociIssuer,
        audience: this.ociAudience,
        algorithms: ['RS256'],
      }));
    } catch (error) {
      if (typeof header.kid !== 'string' || jwks.keys.some((key) => key.kid === header.kid)) {
        const reason = error instanceof Error ? error.name : 'unknown error';
        this.logger.warn(`OCI access-token JWT verification failed (${reason}).`);
        throw new UnauthorizedException('Invalid or expired OCI access token');
      }
      jwks = await this.ociJwksService.getJwks(true);
      try {
        ({ payload } = await jwtVerify(token, createLocalJWKSet(jwks), {
          issuer: this.ociIssuer,
          audience: this.ociAudience,
          algorithms: ['RS256'],
        }));
      } catch (refreshError) {
        const reason = refreshError instanceof Error ? refreshError.name : 'unknown error';
        this.logger.warn(`OCI access-token JWT verification failed after key refresh (${reason}).`);
        throw new UnauthorizedException('Invalid or expired OCI access token');
      }
    }

    if (typeof payload.sub !== 'string' || !payload.sub) {
      throw new UnauthorizedException('OCI access token is missing a subject');
    }
    const scopeClaim = payload.scope ?? payload.scp;
    const scopes = Array.isArray(scopeClaim)
      ? scopeClaim
      : typeof scopeClaim === 'string'
        ? scopeClaim.split(/\s+/)
        : [];
    if (!scopes.includes(this.ociScope!) && !scopes.includes(this.ociScopePath!)) {
      throw new UnauthorizedException('OCI access token is missing the required API scope');
    }

    const { dbUser, created } = await this.findOrCreateOciDbUser(payload.sub, token);
    if (created) {
      this.email.sendWelcome(dbUser.email, dbUser.fullName.split(' ')[0]).catch((err) => {
        this.logger.warn(`Failed to send welcome email: ${err.message}`);
      });
    }
    if (dbUser.status !== 'ACTIVE') {
      throw new ForbiddenException('This account is not active');
    }

    request.user = {
      id: dbUser.supabaseId || payload.sub,
      sub: payload.sub,
      ociSub: payload.sub,
      email: dbUser.email,
      roles: dbUser.roles.map((r) => r.role.name),
      dbUser,
    };
    return true;
  }

  private async findOrCreateOciDbUser(subject: string, token: string) {
    const include = { roles: { include: { role: true } } };
    const linkedUser = await this.prisma.user.findUnique({
      where: { ociSub: subject },
      include,
    });
    if (linkedUser) {
      if (linkedUser.supabaseId) return { dbUser: linkedUser, created: false };
      const dbUser = await this.prisma.user.update({
        where: { id: linkedUser.id },
        data: { supabaseId: subject },
        include,
      });
      return { dbUser, created: false };
    }

    let response: Response;
    try {
      response = await fetch(this.ociUserinfoUrl!, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException('OCI identity service is unavailable');
    }
    if (response.status >= 500) {
      throw new ServiceUnavailableException('OCI identity service is unavailable');
    }
    if (!response.ok) {
      throw new UnauthorizedException('OCI access token could not retrieve a user profile');
    }

    const profile: unknown = await response.json();
    if (!profile || typeof profile !== 'object') {
      throw new UnauthorizedException('OCI returned an invalid user profile');
    }
    const claims = profile as Record<string, unknown>;
    if (claims.sub !== subject) {
      throw new UnauthorizedException('OCI user profile subject does not match the access token');
    }
    if (claims.email_verified !== true) {
      throw new ForbiddenException('Verify your email with OCI before using JobIN.');
    }
    if (typeof claims.email !== 'string' || !claims.email.trim()) {
      throw new ForbiddenException('Your OCI profile must include a verified email address.');
    }

    const email = claims.email.trim().toLowerCase();
    const fullName =
      (typeof claims.name === 'string' && claims.name.trim()) ||
      [claims.given_name, claims.family_name]
        .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
        .join(' ') ||
      email.split('@')[0];
    const avatarUrl = typeof claims.picture === 'string' ? claims.picture : null;
    const existingEmailUser = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include,
    });
    if (existingEmailUser?.ociSub && existingEmailUser.ociSub !== subject) {
      throw new ConflictException('This email is already linked to another OCI account.');
    }

    if (existingEmailUser) {
      const dbUser = await this.prisma.user.update({
        where: { id: existingEmailUser.id },
        data: {
          ociSub: subject,
          ...(existingEmailUser.supabaseId ? {} : { supabaseId: subject }),
        },
        include,
      });
      return { dbUser, created: false };
    }

    try {
      const dbUser = await this.prisma.user.create({
        data: {
          ociSub: subject,
          supabaseId: subject,
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
        where: { ociSub: subject },
        include,
      });
      if (racedUser) return { dbUser: racedUser, created: false };

      this.logger.warn(`OCI user sync encountered a unique constraint conflict for ${subject}`);
      throw new ConflictException(
        'An account with this email already exists. Please contact support.',
      );
    }
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
      if (user.email && !user.email_confirmed_at) {
        throw new ForbiddenException('Confirm your email before linking this existing account.');
      }

      const auth0OnlyIdentity =
        existingEmailUser.auth0Sub && existingEmailUser.supabaseId === existingEmailUser.auth0Sub;
      const ociOnlyIdentity =
        existingEmailUser.ociSub && existingEmailUser.supabaseId === existingEmailUser.ociSub;
      if (
        existingEmailUser.supabaseId &&
        existingEmailUser.supabaseId !== user.id &&
        !auth0OnlyIdentity &&
        !ociOnlyIdentity
      ) {
        return { dbUser: existingEmailUser, created: false };
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
