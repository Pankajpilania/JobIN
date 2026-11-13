import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AISettingsCrypto } from '../ai/ai-settings-crypto';
import { S3Service } from '../s3/s3.service';
import type {
  ListUsersDto,
  AdminUpdateUserDto,
  SendNotificationDto,
  ListSubscriptionsDto,
  UpdateStripePricesDto,
  UpdateAIPlatformSettingsDto,
  CreateDiscountCodeDto,
  ListDiscountCodesDto,
  CreateRefundDto,
  CreateSiteBannerDto,
  UpdateSiteBannerDto,
  UpdateRolePermissionsDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly stripe?: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    private readonly aiSettingsCrypto: AISettingsCrypto,
    private readonly s3: S3Service,
  ) {
    const stripeSecret = this.config.get<string>('STRIPE_SECRET_KEY');
    if (stripeSecret) {
      this.stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' as any });
    }
  }

  async listAdminRoles() {
    const [roles, permissions] = await Promise.all([
      this.prisma.role.findMany({
        where: { name: { in: ['OPERATIONS_ADMIN', 'SUPPORT_ADMIN', 'FINANCE_ADMIN'] } },
        include: { permissions: { include: { permission: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.permission.findMany({ orderBy: { action: 'asc' } }),
    ]);
    return {
      permissions,
      roles: roles.map(({ permissions: assigned, ...role }) => ({
        ...role,
        permissions: assigned.map(({ permission }) => permission.action),
      })),
    };
  }

  async updateAdminRolePermissions(
    adminId: string,
    roleId: string,
    dto: UpdateRolePermissionsDto,
    ipAddress?: string,
  ) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role || !['OPERATIONS_ADMIN', 'SUPPORT_ADMIN', 'FINANCE_ADMIN'].includes(role.name)) {
      throw new NotFoundException('Editable admin role not found.');
    }
    if (!dto.permissions.includes('admin:access')) {
      throw new BadRequestException('Admin portal access must remain assigned to this role.');
    }
    const requested = await this.prisma.permission.findMany({
      where: { action: { in: dto.permissions } },
    });
    if (requested.length !== dto.permissions.length) {
      throw new BadRequestException('One or more permissions are unknown.');
    }
    const before = role.permissions.map(({ permission }) => permission.action).sort();
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: requested.map(({ id }) => ({ roleId, permissionId: id })),
      }),
    ]);
    await this.audit(
      adminId,
      'ADMIN_UPDATE_ROLE_PERMISSIONS',
      'Role',
      roleId,
      { permissions: before },
      { permissions: [...dto.permissions].sort() },
      undefined,
      ipAddress,
    );
    return { roleId, permissions: [...dto.permissions].sort() };
  }

  // ─── Audit logging ────────────────────────────────────────────────────────

  async audit(
    adminId: string,
    action: string,
    targetEntity: string,
    targetId?: string,
    beforeState?: object,
    afterState?: object,
    metadata?: object,
    ipAddress?: string,
  ) {
    await this.prisma.auditLog
      .create({
        data: {
          userId: adminId,
          action,
          targetEntity,
          targetId: targetId ?? null,
          beforeState: beforeState ? (beforeState as any) : undefined,
          afterState: afterState ? (afterState as any) : undefined,
          metadata: metadata ? (metadata as any) : undefined,
          ipAddress: ipAddress ?? 'unknown',
        },
      })
      .catch((err) => this.logger.error('Audit log failed', err));
  }

  // ─── Dashboard metrics ────────────────────────────────────────────────────

  async getMetrics() {
    const now = new Date();
    const ago30 = new Date(now.getTime() - 30 * 86_400_000);
    const ago7 = new Date(now.getTime() - 7 * 86_400_000);

    const [
      totalUsers,
      activeUsers,
      newUsersMonth,
      suspendedUsers,
      paidUsers,
      freeUsers,
      totalResumes,
      totalApplications,
      totalAIRequests,
      aiCostAggregate,
      activeSubscriptions,
      cancelledMonth,
      allActiveSubs,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE', lastLoginAt: { gte: ago30 } } }),
      this.prisma.user.count({ where: { createdAt: { gte: ago30 } } }),
      this.prisma.user.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.user.count({
        where: {
          status: 'ACTIVE',
          subscriptions: {
            some: { status: 'ACTIVE', plan: { name: { not: 'FREE' } } },
          },
        },
      }),
      this.prisma.user.count({
        where: {
          status: 'ACTIVE',
          subscriptions: {
            none: { status: 'ACTIVE', plan: { name: { not: 'FREE' } } },
          },
        },
      }),
      this.prisma.resume.count(),
      this.prisma.jobApplication.count(),
      this.prisma.aIUsage.count(),
      this.prisma.aIUsage.aggregate({ _sum: { estimatedCostUsd: true, totalTokens: true } }),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.subscription.count({ where: { status: 'CANCELLED', updatedAt: { gte: ago30 } } }),
      this.prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
        include: { plan: true },
      }),
    ]);

    // MRR = sum of all active subscription monthly prices
    const mrr = allActiveSubs.reduce((sum, sub) => sum + (sub.plan?.priceMonthly ?? 0), 0);
    const arr = mrr * 12;

    // Churn rate = cancelled in last 30d / (active + cancelled in last 30d)
    const churnDenominator = activeSubscriptions + cancelledMonth;
    const churnRate =
      churnDenominator > 0 ? Math.round((cancelledMonth / churnDenominator) * 100 * 10) / 10 : 0;

    // User growth last 7 days (grouped by day)
    const userGrowth = await this.prisma.$queryRaw<{ day: string; count: number }[]>`
      SELECT DATE_TRUNC('day', "createdAt")::date AS day, COUNT(*)::int AS count
      FROM "User"
      WHERE "createdAt" >= ${ago7}
      GROUP BY day ORDER BY day ASC
    `;

    // Revenue last 6 months (grouped by month)
    const revenueByMonth = await this.prisma.$queryRaw<{ month: string; revenue: number }[]>`
      SELECT TO_CHAR(DATE_TRUNC('month', p."createdAt"), 'Mon YYYY') AS month,
             SUM(p.amount)::float AS revenue
      FROM "Payment" p
      WHERE p."createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', p."createdAt")
      ORDER BY DATE_TRUNC('month', p."createdAt") ASC
    `.catch(() => []);

    return {
      totalUsers,
      activeUsers,
      newUsersMonth,
      suspendedUsers,
      paidUsers,
      freeUsers,
      totalResumes,
      totalApplications,
      totalAIRequests,
      totalTokensUsed: aiCostAggregate._sum.totalTokens ?? 0,
      totalAICostUsd: Math.round((aiCostAggregate._sum.estimatedCostUsd ?? 0) * 100) / 100,
      activeSubscriptions,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      churnRate,
      userGrowth,
      revenueByMonth,
    };
  }

  // ─── Users ───────────────────────────────────────────────────────────────

  async listUsers(dto: ListUsersDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (dto.status) where.status = dto.status;
    if (dto.search) {
      where.OR = [
        { email: { contains: dto.search, mode: 'insensitive' } },
        { fullName: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = { [dto.sortBy ?? 'createdAt']: dto.sortDir ?? 'desc' };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          roles: { include: { role: true } },
          subscriptions: {
            include: { plan: true },
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: { select: { resumes: true, jobApplications: true, aiUsage: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUserActivity(userId: string) {
    const [user, plans] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscriptions: {
            where: { status: 'ACTIVE' },
            include: { plan: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.plan.findMany({
        where: { isActive: true },
        select: { id: true, name: true, priceMonthly: true, currency: true },
        orderBy: { priceMonthly: 'asc' },
      }),
    ]);
    if (!user) throw new NotFoundException('User not found');

    const [resumes, aiUsage, applications, auditLogs] = await Promise.all([
      this.prisma.resume.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.aIUsage.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      this.prisma.jobApplication.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    const totalTokens = aiUsage.reduce((s, u) => s + u.totalTokens, 0);
    const totalCostUsd = aiUsage.reduce((s, u) => s + u.estimatedCostUsd, 0);

    return {
      user,
      plans,
      resumes,
      aiUsage,
      applications,
      auditLogs,
      totalTokens,
      totalCostUsd: Math.round(totalCostUsd * 100) / 100,
    };
  }

  async deleteUser(adminId: string, userId: string, ipAddress?: string) {
    if (adminId === userId) {
      throw new ForbiddenException('You cannot delete your own admin account.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        subscriptions: {
          where: { status: { in: ['ACTIVE', 'PAST_DUE'] } },
          select: { stripeSubscriptionId: true },
        },
        resumes: {
          select: {
            s3Key: true,
            versions: { select: { s3Key: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const protectedRoles = ['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'SUPPORT_ADMIN', 'FINANCE_ADMIN'];
    if (user.roles.some(({ role }) => protectedRoles.includes(role.name))) {
      throw new ForbiddenException('Admin accounts cannot be deleted from user management.');
    }

    const stripeSubscriptionIds = user.subscriptions
      .map(({ stripeSubscriptionId }) => stripeSubscriptionId)
      .filter((id) => id.startsWith('sub_'));
    const stripeSecretKey = this.config.get<string>('STRIPE_SECRET_KEY')?.trim();
    if (stripeSubscriptionIds.length && !stripeSecretKey) {
      throw new ServiceUnavailableException(
        'Stripe billing is not configured. Configure STRIPE_SECRET_KEY before deleting users with Stripe subscriptions.',
      );
    }

    const supabaseId =
      user.supabaseId && user.supabaseId !== user.auth0Sub && user.supabaseId !== user.ociSub
        ? user.supabaseId
        : null;
    const supabaseUrl = this.config.get<string>('NEXT_PUBLIC_SUPABASE_URL')?.trim();
    const supabaseServiceKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    if (user.auth0Sub) {
      const auth0Domain = this.config.get<string>('AUTH0_DOMAIN')?.trim();
      const auth0ClientId = this.config.get<string>('AUTH0_MANAGEMENT_CLIENT_ID')?.trim();
      const auth0ClientSecret = this.config.get<string>('AUTH0_MANAGEMENT_CLIENT_SECRET')?.trim();
      if (!auth0Domain || !auth0ClientId || !auth0ClientSecret) {
        throw new ServiceUnavailableException(
          'Auth0 account deletion is not configured. Configure the Auth0 Management API credentials with delete:users permission.',
        );
      }
    }
    if (user.ociSub) {
      const ociDomainUrl = this.config.get<string>('OCI_DOMAIN_URL')?.trim();
      const ociClientId = this.config.get<string>('OCI_MANAGEMENT_CLIENT_ID')?.trim();
      const ociClientSecret = this.config.get<string>('OCI_MANAGEMENT_CLIENT_SECRET')?.trim();
      if (!ociDomainUrl || !ociClientId || !ociClientSecret) {
        throw new ServiceUnavailableException(
          'OCI account deletion is not configured. Configure an OCI Identity Domains management client with permission to delete users.',
        );
      }
    }
    if (supabaseId && (!supabaseUrl || !supabaseServiceKey)) {
      throw new ServiceUnavailableException(
        'Supabase admin access is not configured. Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before deleting this user.',
      );
    }

    if (stripeSubscriptionIds.length && stripeSecretKey) {
      const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' as any });
      try {
        for (const subscriptionId of stripeSubscriptionIds) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          if (
            ['active', 'trialing', 'past_due', 'unpaid', 'incomplete'].includes(subscription.status)
          ) {
            await stripe.subscriptions.cancel(subscriptionId);
          }
        }
      } catch (error) {
        const errorType = error instanceof Error ? error.name : 'unknown error';
        this.logger.error(
          `Failed to cancel Stripe subscriptions for user ${userId} (${errorType}).`,
        );
        throw new InternalServerErrorException(
          'Could not cancel the user’s Stripe subscription. The account was not deleted.',
        );
      }
    }

    if (user.auth0Sub) {
      await this.deleteAuth0User(user.auth0Sub);
    }
    if (user.ociSub) {
      await this.deleteOciUser(user.ociSub);
    }
    if (supabaseId && supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error } = await supabase.auth.admin.deleteUser(supabaseId);
      if (error && error.status !== 404) {
        this.logger.error(`Failed to delete Supabase user ${supabaseId}: ${error.message}`);
        throw new InternalServerErrorException(
          'Could not delete the user’s authentication account. The application data was not deleted.',
        );
      }
    }

    const objectKeys = new Set<string>();
    for (const resume of user.resumes) {
      objectKeys.add(resume.s3Key);
      for (const version of resume.versions) {
        if (version.s3Key) objectKeys.add(version.s3Key);
      }
    }
    await Promise.all(Array.from(objectKeys, (key) => this.s3.deleteFileOrThrow(key)));

    await this.prisma.$transaction(async (transaction) => {
      await transaction.auditLog.updateMany({ where: { userId }, data: { userId: null } });
      await transaction.user.delete({ where: { id: userId } });
    });

    await this.audit(
      adminId,
      'ADMIN_DELETE_USER',
      'User',
      userId,
      { email: user.email, fullName: user.fullName },
      undefined,
      {
        deletedSupabaseAccount: Boolean(supabaseId),
        deletedAuth0Account: Boolean(user.auth0Sub),
        deletedOciAccount: Boolean(user.ociSub),
      },
      ipAddress,
    );
    return { deleted: true };
  }

  private async deleteAuth0User(subject: string) {
    const domain = this.config
      .get<string>('AUTH0_DOMAIN')!
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '');
    const clientId = this.config.get<string>('AUTH0_MANAGEMENT_CLIENT_ID')!.trim();
    const clientSecret = this.config.get<string>('AUTH0_MANAGEMENT_CLIENT_SECRET')!.trim();
    const issuer = `https://${domain}`;

    let tokenResponse: Response;
    try {
      tokenResponse = await fetch(`${issuer}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          audience: `${issuer}/api/v2/`,
        }),
      });
    } catch (error) {
      this.logger.error(
        `Could not connect to Auth0 Management API (${error instanceof Error ? error.name : 'unknown error'}).`,
      );
      throw new InternalServerErrorException(
        'Could not contact Auth0 to delete the authentication account. The JobIN data was not deleted.',
      );
    }

    if (!tokenResponse.ok) {
      this.logger.error(`Auth0 Management API token request failed (${tokenResponse.status}).`);
      throw new InternalServerErrorException(
        'Auth0 could not authorize account deletion. The JobIN data was not deleted.',
      );
    }

    const tokenBody = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenBody.access_token) {
      throw new InternalServerErrorException(
        'Auth0 returned no Management API token. The JobIN data was not deleted.',
      );
    }

    let deleteResponse: Response;
    try {
      deleteResponse = await fetch(`${issuer}/api/v2/users/${encodeURIComponent(subject)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenBody.access_token}` },
      });
    } catch (error) {
      this.logger.error(
        `Could not delete Auth0 user ${subject} (${error instanceof Error ? error.name : 'unknown error'}).`,
      );
      throw new InternalServerErrorException(
        'Could not delete the Auth0 account. The JobIN data was not deleted.',
      );
    }
    if (!deleteResponse.ok && deleteResponse.status !== 404) {
      this.logger.error(`Auth0 user deletion failed (${deleteResponse.status}).`);
      throw new InternalServerErrorException(
        'Could not delete the Auth0 account. The JobIN data was not deleted.',
      );
    }
  }

  private async deleteOciUser(subject: string) {
    const configuredDomainUrl = this.config.get<string>('OCI_DOMAIN_URL')!.trim();
    const clientId = this.config.get<string>('OCI_MANAGEMENT_CLIENT_ID')!.trim();
    const clientSecret = this.config.get<string>('OCI_MANAGEMENT_CLIENT_SECRET')!.trim();
    let parsedDomain: URL;
    try {
      parsedDomain = new URL(configuredDomainUrl);
    } catch {
      throw new ServiceUnavailableException('OCI Identity Domains URL is invalid.');
    }
    if (
      parsedDomain.protocol !== 'https:' ||
      parsedDomain.username ||
      parsedDomain.password ||
      parsedDomain.pathname !== '/' ||
      parsedDomain.search ||
      parsedDomain.hash
    ) {
      throw new ServiceUnavailableException(
        'OCI Identity Domains URL must be an HTTPS origin without credentials, path, or query.',
      );
    }
    const domainUrl = parsedDomain.origin;

    let tokenResponse: Response;
    try {
      tokenResponse = await fetch(`${domainUrl}/oauth2/v1/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'urn:opc:idm:__myscopes__',
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      this.logger.error(
        `Could not connect to OCI Identity Domains (${error instanceof Error ? error.name : 'unknown error'}).`,
      );
      throw new InternalServerErrorException(
        'Could not contact OCI to delete the authentication account. The JobIN data was not deleted.',
      );
    }
    if (!tokenResponse.ok) {
      this.logger.error(`OCI management token request failed (${tokenResponse.status}).`);
      throw new InternalServerErrorException(
        'OCI could not authorize account deletion. The JobIN data was not deleted.',
      );
    }

    let tokenPayload: unknown;
    try {
      tokenPayload = await tokenResponse.json();
    } catch {
      throw new InternalServerErrorException(
        'OCI returned an invalid management token response. The JobIN data was not deleted.',
      );
    }
    if (!tokenPayload || typeof tokenPayload !== 'object') {
      throw new InternalServerErrorException(
        'OCI returned an invalid management token response. The JobIN data was not deleted.',
      );
    }
    const accessToken = (tokenPayload as Record<string, unknown>).access_token;
    if (typeof accessToken !== 'string' || !accessToken) {
      throw new InternalServerErrorException(
        'OCI returned no management token. The JobIN data was not deleted.',
      );
    }

    let deleteResponse: Response;
    try {
      deleteResponse = await fetch(`${domainUrl}/admin/v1/Users/${encodeURIComponent(subject)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      this.logger.error(
        `Could not delete OCI user ${subject} (${error instanceof Error ? error.name : 'unknown error'}).`,
      );
      throw new InternalServerErrorException(
        'Could not contact OCI to delete the authentication account. The JobIN data was not deleted.',
      );
    }
    if (!deleteResponse.ok && deleteResponse.status !== 404) {
      this.logger.error(`OCI user deletion failed (${deleteResponse.status}) for ${subject}.`);
      throw new InternalServerErrorException(
        'OCI could not delete the authentication account. The JobIN data was not deleted.',
      );
    }
  }

  async updateUser(adminId: string, userId: string, dto: AdminUpdateUserDto, ipAddress?: string) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: {
        roles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
    const adminRoles = new Set(admin?.roles.map(({ role }) => role.name) ?? []);
    const adminPermissions = new Set(
      admin?.roles.flatMap(({ role }) =>
        (role.permissions ?? []).map(({ permission }) => permission.action),
      ) ?? [],
    );
    const isSuperAdmin = adminRoles.has('SUPER_ADMIN');

    if (!admin) throw new ForbiddenException('Administrator account not found.');
    if (
      (dto.planId || dto.grantCredits !== undefined) &&
      !isSuperAdmin &&
      !adminPermissions.has('users:manage_billing')
    ) {
      throw new ForbiddenException('Finance admin access is required to change plans or credits.');
    }

    let roleId: string | undefined;
    if (dto.role) {
      if (!isSuperAdmin) {
        throw new ForbiddenException('Only super admins can assign user roles.');
      }

      const roleToAssign = await this.prisma.role.findFirst({ where: { name: dto.role } });
      if (!roleToAssign) throw new NotFoundException('Role not found');
      roleId = roleToAssign.id;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('User not found');

    if (
      dto.status &&
      dto.status !== user.status &&
      !isSuperAdmin &&
      !adminPermissions.has('users:manage_status')
    ) {
      throw new ForbiddenException(
        'Support or operations admin access is required to change account status.',
      );
    }

    const beforeState = {
      status: user.status,
      roles: user.roles.map((r) => r.role.name),
    };

    if (dto.status) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: dto.status as any },
      });
    }

    if (dto.planId) {
      const plan = await this.prisma.plan.findFirst({
        where: { id: dto.planId, isActive: true },
      });
      if (!plan) throw new NotFoundException('Active plan not found');
      const now = new Date();
      const durationDays = dto.planDurationDays ?? (dto.planDurationDays === null ? null : 30);
      const end =
        durationDays === null ? null : new Date(now.getTime() + durationDays * 86_400_000);
      await this.prisma.$transaction(async (transaction) => {
        await transaction.subscription.updateMany({
          where: { userId, status: 'ACTIVE' },
          data: { status: 'CANCELLED' },
        });
        await transaction.subscription.create({
          data: {
            userId,
            planId: plan.id,
            status: 'ACTIVE',
            stripeSubscriptionId: `admin-${randomUUID()}`,
            currentPeriodStart: now,
            currentPeriodEnd: end,
            isComplimentary: true,
          },
        });
      });
    }

    if (dto.grantCredits !== undefined && dto.grantCredits > 0) {
      await this.prisma.aICredits.upsert({
        where: { userId },
        create: { userId, totalCredits: dto.grantCredits, grantedBy: adminId },
        update: { totalCredits: { increment: dto.grantCredits }, grantedBy: adminId },
      });
    }

    if (roleId) {
      await this.prisma.userRole.upsert({
        where: { userId_roleId: { userId, roleId } },
        create: { userId, roleId },
        update: {},
      });
    }

    const afterState = {
      status: dto.status ?? user.status,
      planId: dto.planId,
      planDurationDays: dto.planId
        ? (dto.planDurationDays ?? (dto.planDurationDays === null ? null : 30))
        : undefined,
      complimentary: Boolean(dto.planId),
      grantedCredits: dto.grantCredits,
      assignedRole: dto.role,
    };

    await this.audit(
      adminId,
      'ADMIN_UPDATE_USER',
      'User',
      userId,
      beforeState,
      afterState,
      { note: dto.note },
      ipAddress,
    );

    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } }, subscriptions: { include: { plan: true } } },
    });
  }

  async getStripePrices() {
    const configs = await this.prisma.stripePriceConfig.findMany({
      include: { plan: { select: { name: true } } },
    });
    return configs.map(({ plan, ...config }) => ({ ...config, plan: plan.name }));
  }

  async updateStripePrices(adminId: string, dto: UpdateStripePricesDto, ipAddress?: string) {
    const prices = dto.prices
      .map((price) => ({ ...price, stripePriceId: price.stripePriceId.trim() }))
      .filter((price) => price.stripePriceId);
    const combinations = prices.map((price) => `${price.plan}:${price.currency}:${price.interval}`);
    const stripePriceIds = prices.map((price) => price.stripePriceId);
    if (
      new Set(combinations).size !== combinations.length ||
      new Set(stripePriceIds).size !== stripePriceIds.length
    ) {
      throw new BadRequestException(
        'Each plan, currency, interval, and Stripe Price ID must be unique.',
      );
    }
    if (prices.some((price) => !/^price_[A-Za-z0-9]+$/.test(price.stripePriceId))) {
      throw new BadRequestException('Stripe Price IDs must start with price_.');
    }

    if (prices.length) {
      const stripeSecretKey = this.config.get<string>('STRIPE_SECRET_KEY')?.trim();
      if (!stripeSecretKey) {
        throw new ServiceUnavailableException(
          'Configure STRIPE_SECRET_KEY before saving Stripe prices.',
        );
      }

      const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' as any });
      await Promise.all(
        prices.map(async (price) => {
          let stripePrice: Stripe.Price;
          try {
            stripePrice = await stripe.prices.retrieve(price.stripePriceId);
          } catch (error) {
            if (error instanceof Stripe.errors.StripeInvalidRequestError) {
              throw new BadRequestException(
                `Stripe Price ${price.stripePriceId} could not be found in the configured Stripe account.`,
              );
            }
            const errorType = error instanceof Error ? error.name : 'unknown error';
            this.logger.error(`Stripe Price verification failed (${errorType}).`);
            throw new ServiceUnavailableException(
              'Could not verify Stripe prices. Check the API credentials and Stripe availability.',
            );
          }

          const expectedInterval = price.interval === 'MONTHLY' ? 'month' : 'year';
          if (
            !stripePrice.active ||
            stripePrice.currency.toUpperCase() !== price.currency ||
            stripePrice.type !== 'recurring' ||
            stripePrice.recurring?.interval !== expectedInterval ||
            stripePrice.recurring.interval_count !== 1
          ) {
            throw new BadRequestException(
              `Stripe Price ${price.stripePriceId} must be active, recurring, and match ${price.currency} ${expectedInterval} billing.`,
            );
          }
        }),
      );
    }

    const plans = await this.prisma.plan.findMany({
      where: { name: { in: [...new Set(prices.map((price) => price.plan))] } },
      select: { id: true, name: true },
    });
    const planIds = new Map(plans.map((plan) => [plan.name, plan.id]));
    if (prices.some((price) => !planIds.has(price.plan))) {
      throw new BadRequestException('A configured subscription plan does not exist.');
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.stripePriceConfig.deleteMany();
      for (const price of prices) {
        await transaction.stripePriceConfig.create({
          data: {
            planId: planIds.get(price.plan)!,
            currency: price.currency,
            interval: price.interval,
            stripePriceId: price.stripePriceId,
          },
        });
      }
    });

    await this.audit(
      adminId,
      'ADMIN_UPDATE_STRIPE_PRICES',
      'StripePriceConfig',
      undefined,
      undefined,
      { prices },
      undefined,
      ipAddress,
    );
    return this.getStripePrices();
  }

  async getDiscountCodes(dto: ListDiscountCodesDto) {
    const stripe = this.discountStripeClient();
    try {
      const page = await stripe.promotionCodes.list({
        limit: dto.limit,
        starting_after: dto.startingAfter,
        expand: ['data.coupon'],
      });
      return {
        data: page.data.map((promotionCode) => this.discountCodeSummary(promotionCode)),
        hasMore: page.has_more,
        nextCursor: page.has_more ? (page.data.at(-1)?.id ?? null) : null,
      };
    } catch (error) {
      this.throwDiscountStripeError(error, 'list discount codes');
    }
  }

  async createDiscountCode(adminId: string, dto: CreateDiscountCodeDto, ipAddress?: string) {
    const code = dto.code.trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,40}$/.test(code)) {
      throw new BadRequestException('Use 3–40 letters, numbers, or hyphens for the discount code.');
    }
    if (
      dto.duration === 'REPEATING' &&
      (!Number.isInteger(dto.durationInMonths) || (dto.durationInMonths ?? 0) < 1)
    ) {
      throw new BadRequestException('Enter a positive number of months for a repeating discount.');
    }
    if (dto.duration !== 'REPEATING' && dto.durationInMonths !== undefined) {
      throw new BadRequestException('Only repeating discounts can have a month duration.');
    }

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now())) {
      throw new BadRequestException('The expiry date must be in the future.');
    }

    const stripe = this.discountStripeClient();
    let couponId: string | null = null;
    try {
      const coupon = await stripe.coupons.create({
        name: `${code} ${dto.percentOff}% off`.slice(0, 40),
        percent_off: dto.percentOff,
        duration: dto.duration.toLowerCase() as Stripe.CouponCreateParams.Duration,
        ...(dto.duration === 'REPEATING' ? { duration_in_months: dto.durationInMonths } : {}),
        metadata: { jobinPromotionCode: code, createdByAdminId: adminId },
      });
      couponId = coupon.id;

      const promotionCode = await stripe.promotionCodes.create({
        coupon: coupon.id,
        code,
        ...(expiresAt ? { expires_at: Math.ceil(expiresAt.getTime() / 1000) } : {}),
        ...(dto.maxRedemptions !== undefined ? { max_redemptions: dto.maxRedemptions } : {}),
        metadata: { createdByAdminId: adminId },
        expand: ['coupon'],
      });
      const summary = this.discountCodeSummary(promotionCode);

      await this.audit(
        adminId,
        'ADMIN_CREATE_DISCOUNT_CODE',
        'StripePromotionCode',
        promotionCode.id,
        undefined,
        summary,
        { couponId: coupon.id },
        ipAddress,
      );
      return summary;
    } catch (error) {
      if (couponId) {
        await stripe.coupons.del(couponId).catch((cleanupError) => {
          const errorType = cleanupError instanceof Error ? cleanupError.name : 'unknown error';
          this.logger.error(`Discount coupon cleanup failed (${errorType}).`);
        });
      }
      this.throwDiscountStripeError(error, 'create discount code');
    }
  }

  async deactivateDiscountCode(adminId: string, promotionCodeId: string, ipAddress?: string) {
    const stripe = this.discountStripeClient();
    try {
      const current = await stripe.promotionCodes.retrieve(promotionCodeId, { expand: ['coupon'] });
      if (!current.active) return this.discountCodeSummary(current);

      const updated = await stripe.promotionCodes.update(promotionCodeId, {
        active: false,
        expand: ['coupon'],
      });
      const beforeState = this.discountCodeSummary(current);
      const afterState = this.discountCodeSummary(updated);
      await this.audit(
        adminId,
        'ADMIN_DEACTIVATE_DISCOUNT_CODE',
        'StripePromotionCode',
        promotionCodeId,
        beforeState,
        afterState,
        undefined,
        ipAddress,
      );
      return afterState;
    } catch (error) {
      if (error instanceof Stripe.errors.StripeInvalidRequestError && error.statusCode === 404) {
        throw new NotFoundException('Discount code not found.');
      }
      this.throwDiscountStripeError(error, 'deactivate discount code');
    }
  }

  private discountStripeClient(): Stripe {
    const stripeSecretKey = this.config.get<string>('STRIPE_SECRET_KEY')?.trim();
    if (!stripeSecretKey) {
      throw new ServiceUnavailableException(
        'Configure STRIPE_SECRET_KEY before managing discount codes.',
      );
    }
    return new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' as any });
  }

  private discountCodeSummary(promotionCode: Stripe.PromotionCode) {
    const coupon = promotionCode.coupon;
    const now = Math.floor(Date.now() / 1000);
    const expired =
      Boolean(promotionCode.expires_at && promotionCode.expires_at <= now) || !coupon.valid;
    const exhausted = Boolean(
      promotionCode.max_redemptions &&
      promotionCode.times_redeemed >= promotionCode.max_redemptions,
    );
    const status = expired
      ? 'expired'
      : exhausted
        ? 'exhausted'
        : promotionCode.active
          ? 'active'
          : 'inactive';

    return {
      id: promotionCode.id,
      couponId: coupon.id,
      code: promotionCode.code,
      percentOff: coupon.percent_off,
      duration: coupon.duration,
      durationInMonths: coupon.duration_in_months,
      active: promotionCode.active,
      status,
      expiresAt: promotionCode.expires_at
        ? new Date(promotionCode.expires_at * 1000).toISOString()
        : null,
      maxRedemptions: promotionCode.max_redemptions,
      timesRedeemed: promotionCode.times_redeemed,
      createdAt: new Date(promotionCode.created * 1000).toISOString(),
    };
  }

  private throwDiscountStripeError(error: unknown, operation: string): never {
    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      if (error.code === 'promotion_code_exists') {
        throw new ConflictException(
          'That discount code is already active. Choose a different code.',
        );
      }
      throw new BadRequestException(
        'Stripe rejected the discount-code details. Check the code, expiry, and discount duration.',
      );
    }
    const errorType = error instanceof Error ? error.name : 'unknown error';
    this.logger.error(`Stripe could not ${operation} (${errorType}).`);
    throw new ServiceUnavailableException('Discount codes are temporarily unavailable.');
  }

  private aiProviderDefaults() {
    return [
      { id: 'GEMINI', label: 'Google Gemini', model: 'gemini-2.5-flash', baseUrl: '' },
      {
        id: 'OPENAI',
        label: 'OpenAI (ChatGPT API)',
        model: 'gpt-4o-mini',
        baseUrl: 'https://api.openai.com/v1',
      },
      {
        id: 'ANTHROPIC',
        label: 'Anthropic Claude',
        model: 'claude-3-5-haiku-latest',
        baseUrl: 'https://api.anthropic.com',
      },
      {
        id: 'DEEPSEEK',
        label: 'DeepSeek',
        model: 'deepseek-chat',
        baseUrl: 'https://api.deepseek.com',
      },
      {
        id: 'GROQ',
        label: 'Groq',
        model: 'llama-3.3-70b-versatile',
        baseUrl: 'https://api.groq.com/openai/v1',
      },
      {
        id: 'KIMI',
        label: 'Kimi (Moonshot AI)',
        model: 'kimi-k3.1-pro',
        baseUrl: 'https://api.moonshot.ai/v1',
      },
      {
        id: 'NVIDIA',
        label: 'NVIDIA NIM',
        model: 'meta/llama-3.1-8b-instruct',
        baseUrl: 'https://integrate.api.nvidia.com/v1',
      },
      { id: 'OLLAMA', label: 'Ollama / local LLM', model: 'llama3.2', baseUrl: '' },
    ];
  }

  async getAIPlatformSettings() {
    const [settings, credentials] = await Promise.all([
      this.prisma.aIPlatformSettings.findUnique({ where: { id: 'global' } }),
      this.prisma.aIProviderCredential.findMany({ select: { provider: true } }),
    ]);
    const activeProvider = settings?.activeProvider ?? 'GEMINI';
    const activeModel =
      settings?.activeModel ?? this.config.get<string>('GEMINI_MODEL', 'gemini-2.5-flash');
    const configuredProviders = new Set(credentials.map((credential) => credential.provider));
    if (this.config.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY) {
      configuredProviders.add('GEMINI');
    }
    return {
      activeProvider,
      activeModel,
      baseUrl:
        settings?.baseUrl ??
        this.aiProviderDefaults().find((provider) => provider.id === activeProvider)?.baseUrl ??
        '',
      encryptionKeyConfigured: this.aiSettingsCrypto.isConfigured(),
      providers: this.aiProviderDefaults().map((provider) => ({
        ...provider,
        apiKeyConfigured: configuredProviders.has(provider.id),
      })),
    };
  }

  async updateAIPlatformSettings(
    adminId: string,
    dto: UpdateAIPlatformSettingsDto,
    ipAddress?: string,
  ) {
    const baseUrl = dto.baseUrl?.trim() || null;
    if (baseUrl) {
      const endpoint = new URL(baseUrl);
      if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
        throw new BadRequestException(
          'AI base URLs cannot contain credentials, query parameters, or fragments.',
        );
      }
    }
    const newApiKey = dto.apiKey?.trim();
    const existingCredential = await this.prisma.aIProviderCredential.findUnique({
      where: { provider: dto.provider },
    });
    if (existingCredential?.encryptedApiKey && !this.aiSettingsCrypto.isConfigured()) {
      throw new BadRequestException(
        'AI_SETTINGS_ENCRYPTION_KEY must be configured to use this saved provider key.',
      );
    }
    const hasApiKey = Boolean(
      newApiKey ||
      existingCredential?.encryptedApiKey ||
      (dto.provider === 'GEMINI' &&
        (this.config.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY)),
    );
    if (dto.provider !== 'OLLAMA' && !hasApiKey) {
      throw new BadRequestException('Add an API key for this provider before activating it.');
    }
    if (dto.provider === 'OLLAMA' && !dto.baseUrl?.trim()) {
      throw new BadRequestException('Enter a hosted Ollama URL that the API service can reach.');
    }

    const encryptedApiKey = newApiKey ? this.aiSettingsCrypto.encrypt(newApiKey) : undefined;
    const saved = await this.prisma.$transaction(async (transaction) => {
      if (encryptedApiKey) {
        await transaction.aIProviderCredential.upsert({
          where: { provider: dto.provider },
          create: { provider: dto.provider, encryptedApiKey },
          update: { encryptedApiKey },
        });
      }
      return transaction.aIPlatformSettings.upsert({
        where: { id: 'global' },
        create: {
          id: 'global',
          activeProvider: dto.provider,
          activeModel: dto.model.trim(),
          baseUrl,
        },
        update: {
          activeProvider: dto.provider,
          activeModel: dto.model.trim(),
          baseUrl,
        },
      });
    });

    await this.audit(
      adminId,
      'ADMIN_UPDATE_AI_PLATFORM_SETTINGS',
      'AIPlatformSettings',
      'global',
      undefined,
      {
        activeProvider: saved.activeProvider,
        activeModel: saved.activeModel,
        baseUrl: saved.baseUrl,
      },
      undefined,
      ipAddress,
    );
    return this.getAIPlatformSettings();
  }

  // ─── Subscriptions ────────────────────────────────────────────────────────

  async listSubscriptions(dto: ListSubscriptionsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (dto.status) where.status = dto.status;

    const [subs, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, fullName: true, avatarUrl: true } },
          plan: true,
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      data: subs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Billing ─────────────────────────────────────────────────────────────

  async getBilling() {
    const ago6m = new Date(Date.now() - 180 * 86_400_000);

    const [recentPayments, revenueByCurrency, subsByStatus, topPlans] = await Promise.all([
      this.prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          subscription: {
            include: { user: { select: { email: true, fullName: true } }, plan: true },
          },
        },
      }),
      this.prisma.payment.groupBy({
        by: ['currency'],
        where: { status: { in: ['succeeded', 'partially_refunded', 'refunded'] } },
        _sum: { amount: true, amountRefunded: true },
        _count: { id: true },
      }),
      this.prisma.subscription.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.plan.findMany({
        include: { _count: { select: { subscriptions: true } } },
        where: { subscriptions: { some: { status: 'ACTIVE' } } },
      }),
    ]);

    // Revenue by month (raw SQL)
    const revenueByMonth = await this.prisma.$queryRaw<
      { month: string; currency: string; revenue: number; count: number }[]
    >`
      SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon YYYY') AS month,
             currency,
             SUM(amount - "amountRefunded")::float AS revenue,
             COUNT(*)::int AS count
      FROM "Payment"
      WHERE status IN ('succeeded', 'partially_refunded', 'refunded') AND "createdAt" >= ${ago6m}
      GROUP BY DATE_TRUNC('month', "createdAt"), currency
      ORDER BY DATE_TRUNC('month', "createdAt") ASC
    `;

    return {
      recentPayments,
      revenueByCurrency: revenueByCurrency.map((entry) => ({
        currency: entry.currency,
        amount:
          Math.round(((entry._sum.amount ?? 0) - (entry._sum.amountRefunded ?? 0)) * 100) / 100,
        payments: entry._count.id,
      })),
      totalPayments: revenueByCurrency.reduce((count, entry) => count + entry._count.id, 0),
      subsByStatus,
      topPlans,
      revenueByMonth,
    };
  }

  async refundPayment(
    adminId: string,
    paymentId: string,
    dto: CreateRefundDto,
    ipAddress?: string,
  ) {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe is not configured for refunds.');
    }
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found.');
    if (!payment.stripeIntentId.startsWith('pi_')) {
      throw new ConflictException('Stripe has no payment intent for this payment.');
    }
    if (!['succeeded', 'partially_refunded'].includes(payment.status)) {
      throw new ConflictException('Only successful, not fully refunded payments can be refunded.');
    }

    const totalMinor = Math.round(payment.amount * 100);
    const refundedMinor = Math.round((payment.amountRefunded ?? 0) * 100);
    const remainingMinor = totalMinor - refundedMinor;
    const amount = dto.amount ?? remainingMinor;
    if (amount > remainingMinor) {
      throw new BadRequestException('Refund amount cannot exceed the remaining payment balance.');
    }

    let refund: Stripe.Refund;
    try {
      refund = await this.stripe.refunds.create(
        {
          payment_intent: payment.stripeIntentId,
          amount,
          reason: dto.reason,
          metadata: { jobinPaymentId: payment.id, adminUserId: adminId },
        },
        { idempotencyKey: `admin-refund:${payment.id}:${refundedMinor}:${amount}` },
      );
    } catch (error) {
      const errorType = error instanceof Error ? error.name : 'unknown error';
      this.logger.error(`Stripe refund request failed (${errorType}).`);
      throw new ServiceUnavailableException('Stripe could not process the refund request.');
    }

    await this.audit(
      adminId,
      'ADMIN_CREATE_PAYMENT_REFUND',
      'Payment',
      payment.id,
      { status: payment.status, amountRefunded: payment.amountRefunded ?? 0 },
      {
        refundId: refund.id,
        refundStatus: refund.status,
        amount: refund.amount,
        currency: refund.currency,
      },
      undefined,
      ipAddress,
    );
    return {
      id: refund.id,
      status: refund.status,
      amount: refund.amount,
      currency: refund.currency.toUpperCase(),
    };
  }

  async listSiteBanners() {
    return this.prisma.siteBanner.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  async getPublicSiteBanners() {
    const now = new Date();
    return this.prisma.siteBanner.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        ],
      },
      select: {
        id: true,
        title: true,
        message: true,
        linkText: true,
        linkUrl: true,
        variant: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSiteBanner(adminId: string, dto: CreateSiteBannerDto, ipAddress?: string) {
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    this.validateBannerSchedule(startsAt, endsAt);
    this.validateBannerLink(dto.linkText, dto.linkUrl);
    const banner = await this.prisma.siteBanner.create({
      data: {
        title: dto.title.trim(),
        message: dto.message.trim(),
        linkText: dto.linkText?.trim() || null,
        linkUrl: dto.linkUrl?.trim() || null,
        variant: dto.variant ?? 'INFO',
        isActive: dto.isActive ?? true,
        startsAt,
        endsAt,
        createdBy: adminId,
      },
    });
    await this.audit(
      adminId,
      'ADMIN_CREATE_SITE_BANNER',
      'SiteBanner',
      banner.id,
      undefined,
      banner,
      undefined,
      ipAddress,
    );
    return banner;
  }

  async updateSiteBanner(
    adminId: string,
    bannerId: string,
    dto: UpdateSiteBannerDto,
    ipAddress?: string,
  ) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('Provide at least one field to update.');
    }
    const current = await this.prisma.siteBanner.findUnique({ where: { id: bannerId } });
    if (!current) throw new NotFoundException('Banner not found.');
    const startsAt = dto.startsAt !== undefined ? new Date(dto.startsAt) : current.startsAt;
    const endsAt = dto.endsAt !== undefined ? new Date(dto.endsAt) : current.endsAt;
    this.validateBannerSchedule(startsAt, endsAt);
    this.validateBannerLink(dto.linkText ?? current.linkText, dto.linkUrl ?? current.linkUrl);
    const updated = await this.prisma.siteBanner.update({
      where: { id: bannerId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.message !== undefined ? { message: dto.message.trim() } : {}),
        ...(dto.linkText !== undefined ? { linkText: dto.linkText.trim() || null } : {}),
        ...(dto.linkUrl !== undefined ? { linkUrl: dto.linkUrl.trim() || null } : {}),
        ...(dto.variant !== undefined ? { variant: dto.variant } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.startsAt !== undefined ? { startsAt } : {}),
        ...(dto.endsAt !== undefined ? { endsAt } : {}),
      },
    });
    await this.audit(
      adminId,
      'ADMIN_UPDATE_SITE_BANNER',
      'SiteBanner',
      bannerId,
      current,
      updated,
      undefined,
      ipAddress,
    );
    return updated;
  }

  async deactivateSiteBanner(adminId: string, bannerId: string, ipAddress?: string) {
    const current = await this.prisma.siteBanner.findUnique({ where: { id: bannerId } });
    if (!current) throw new NotFoundException('Banner not found.');
    const updated = await this.prisma.siteBanner.update({
      where: { id: bannerId },
      data: { isActive: false },
    });
    await this.audit(
      adminId,
      'ADMIN_DEACTIVATE_SITE_BANNER',
      'SiteBanner',
      bannerId,
      current,
      updated,
      undefined,
      ipAddress,
    );
    return updated;
  }

  private validateBannerSchedule(startsAt: Date | null, endsAt: Date | null) {
    if (startsAt && endsAt && endsAt <= startsAt) {
      throw new BadRequestException('Banner end time must be later than its start time.');
    }
  }

  private validateBannerLink(linkText?: string | null, linkUrl?: string | null) {
    if (Boolean(linkText) !== Boolean(linkUrl)) {
      throw new BadRequestException(
        'Provide both a link label and a link URL, or leave both empty.',
      );
    }
  }

  async *iterateReportRows(
    report: 'users' | 'billing' | 'subscriptions' | 'ai-usage',
  ): AsyncGenerator<Array<string | number | boolean | Date | null | undefined>> {
    const batchSize = 500;
    let cursor: string | undefined;
    while (true) {
      const pagination: any = cursor ? { cursor: { id: cursor }, skip: 1 } : {};
      let rows: any[];
      switch (report) {
        case 'users':
          rows = await this.prisma.user.findMany({
            ...pagination,
            take: batchSize,
            orderBy: { id: 'asc' },
            include: { roles: { include: { role: true } } },
          });
          break;
        case 'billing':
          rows = await this.prisma.payment.findMany({
            ...pagination,
            take: batchSize,
            orderBy: { id: 'asc' },
            include: { subscription: { include: { user: true, plan: true } } },
          });
          break;
        case 'subscriptions':
          rows = await this.prisma.subscription.findMany({
            ...pagination,
            take: batchSize,
            orderBy: { id: 'asc' },
            include: { user: true, plan: true },
          });
          break;
        case 'ai-usage':
          rows = await this.prisma.aIUsage.findMany({
            ...pagination,
            take: batchSize,
            orderBy: { id: 'asc' },
            include: { user: true },
          });
          break;
      }
      if (!rows.length) return;

      for (const row of rows) {
        if (report === 'users') {
          yield [
            row.id,
            row.email,
            row.fullName,
            row.status,
            row.roles.map(({ role }: any) => role.name).join('|'),
            row.createdAt,
            row.lastLoginAt,
          ];
        } else if (report === 'billing') {
          yield [
            row.id,
            row.subscription?.user?.email,
            row.subscription?.user?.fullName,
            row.subscription?.plan?.name,
            row.stripeInvoiceId,
            row.stripeIntentId,
            row.amount,
            row.amountRefunded,
            row.currency,
            row.status,
            row.failureMessage,
            row.createdAt,
          ];
        } else if (report === 'subscriptions') {
          yield [
            row.id,
            row.user?.email,
            row.user?.fullName,
            row.plan?.name,
            row.status,
            row.isComplimentary,
            row.currentPeriodStart,
            row.currentPeriodEnd,
            row.cancelAtPeriodEnd,
            row.createdAt,
          ];
        } else {
          yield [
            row.id,
            row.user?.email,
            row.user?.fullName,
            row.feature,
            row.modelName,
            row.promptTokens,
            row.completionTokens,
            row.totalTokens,
            row.estimatedCostUsd,
            row.createdAt,
          ];
        }
      }
      if (rows.length < batchSize) return;
      cursor = rows[rows.length - 1].id;
    }
  }

  // ─── AI usage ─────────────────────────────────────────────────────────────

  async getAIUsage() {
    const ago30 = new Date(Date.now() - 30 * 86_400_000);

    const [byModel, byFeature, byDay, topUsers] = await Promise.all([
      // Tokens by model
      this.prisma.aIUsage.groupBy({
        by: ['modelName'],
        _sum: { totalTokens: true, estimatedCostUsd: true },
        _count: { id: true },
        orderBy: { _sum: { totalTokens: 'desc' } },
      }),
      // Requests by feature
      this.prisma.aIUsage.groupBy({
        by: ['feature'],
        _count: { id: true },
        _sum: { totalTokens: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      // Tokens by day last 30 days
      this.prisma.$queryRaw<{ day: string; tokens: number; cost: number }[]>`
        SELECT DATE_TRUNC('day', "createdAt")::date AS day,
               SUM("totalTokens")::int AS tokens,
               SUM("estimatedCostUsd")::float AS cost
        FROM "AIUsage"
        WHERE "createdAt" >= ${ago30}
        GROUP BY day ORDER BY day ASC
      `.catch(() => []),
      // Top users by token usage
      this.prisma.aIUsage.groupBy({
        by: ['userId'],
        _sum: { totalTokens: true, estimatedCostUsd: true },
        _count: { id: true },
        orderBy: { _sum: { totalTokens: 'desc' } },
        take: 10,
      }),
    ]);

    // Enrich top users with email
    const topUserIds = topUsers.map((u) => u.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: topUserIds } },
      select: { id: true, email: true, fullName: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    return {
      byModel,
      byFeature,
      byDay,
      topUsers: topUsers.map((u) => ({ ...u, user: userMap[u.userId] })),
      totals: {
        requests: await this.prisma.aIUsage.count(),
        tokens:
          (await this.prisma.aIUsage.aggregate({ _sum: { totalTokens: true } }))._sum.totalTokens ??
          0,
        costUsd:
          Math.round(
            ((await this.prisma.aIUsage.aggregate({ _sum: { estimatedCostUsd: true } }))._sum
              .estimatedCostUsd ?? 0) * 100,
          ) / 100,
      },
    };
  }

  // ─── Support tickets ──────────────────────────────────────────────────────

  async listTickets(status?: string, page = 1, limit = 25) {
    const skip = (page - 1) * limit;
    const where: any = status ? { status } : {};

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, fullName: true, avatarUrl: true } },
          responses: { orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { responses: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return { data: tickets, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async updateTicket(
    adminId: string,
    ticketId: string,
    status: string,
    assignedTo?: string,
    ipAddress?: string,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: status as any,
        assignedTo: assignedTo,
        resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : undefined,
      },
    });

    await this.audit(
      adminId,
      'ADMIN_UPDATE_TICKET',
      'SupportTicket',
      ticketId,
      { status: ticket.status },
      { status: updated.status },
      undefined,
      ipAddress,
    );

    return updated;
  }

  async replyToTicket(adminId: string, ticketId: string, content: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { user: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const response = await this.prisma.ticketResponse.create({
      data: { ticketId, authorId: adminId, content, isAdmin: true },
    });

    // Email the user
    await this.email.sendSupportReply(
      ticket.user.email,
      ticket.user.fullName,
      ticket.subject,
      content,
    );

    return response;
  }

  // ─── Notifications / email campaign ──────────────────────────────────────

  async sendNotification(adminId: string, dto: SendNotificationDto, ipAddress?: string) {
    let userIds: string[] = [];

    if (dto.userId) {
      userIds = [dto.userId];
    } else {
      // Resolve audience to user IDs
      const where: any = { status: 'ACTIVE' };
      if (dto.audience === 'PREMIUM') {
        where.subscriptions = {
          some: { status: 'ACTIVE', plan: { name: { not: 'FREE' } } },
        };
      }
      if (dto.audience === 'CHURNED') {
        where.subscriptions = { some: { status: 'CANCELLED' } };
      }
      const users = await this.prisma.user.findMany({ where, select: { id: true } });
      userIds = users.map((u) => u.id);
    }

    // Bulk create notification records
    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: (dto.type as any) ?? 'EMAIL',
        subject: dto.subject,
        content: dto.content,
        sentAt: new Date(),
      })),
      skipDuplicates: true,
    });

    // Send email if type is EMAIL
    if (dto.type !== 'IN_APP') {
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { email: true, fullName: true },
      });
      await Promise.allSettled(
        users.map((u) => this.email.sendCampaign(u.email, u.fullName, dto.subject, dto.content)),
      );
    }

    await this.audit(
      adminId,
      'ADMIN_SEND_NOTIFICATION',
      'Notification',
      undefined,
      undefined,
      { audience: dto.audience, userCount: userIds.length },
      undefined,
      ipAddress,
    );

    return { sent: userIds.length, subject: dto.subject };
  }
}
