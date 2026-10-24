import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
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
  UpdateManualPaymentSettingsDto,
  CreateManualPaymentMethodDto,
  UpdateManualPaymentMethodDto,
  UpdateStripePricesDto,
  UpdateAIPlatformSettingsDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    private readonly aiSettingsCrypto: AISettingsCrypto,
    private readonly s3: S3Service,
  ) {}

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

    const supabaseId = user.supabaseId;
    const supabaseUrl = this.config.get<string>('NEXT_PUBLIC_SUPABASE_URL')?.trim();
    const supabaseServiceKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim();
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
      { deletedSupabaseAccount: Boolean(supabaseId) },
      ipAddress,
    );
    return { deleted: true };
  }

  async updateUser(adminId: string, userId: string, dto: AdminUpdateUserDto, ipAddress?: string) {
    let roleId: string | undefined;
    if (dto.role) {
      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
        include: { roles: { include: { role: true } } },
      });
      if (!admin?.roles.some(({ role }) => role.name === 'SUPER_ADMIN')) {
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

  async getManualPaymentSettings() {
    const stored = await this.prisma.manualPaymentSettings.findMany();
    const byCurrency = new Map(stored.map((setting) => [setting.currency, setting]));
    return (['INR', 'GBP'] as const).map((currency) => {
      const setting = byCurrency.get(currency);
      const isInr = currency === 'INR';
      return {
        currency,
        methodLabel: setting?.methodLabel ?? (isInr ? 'INR · UPI' : 'GBP · Bank transfer'),
        paymentDetails:
          setting?.paymentDetails ??
          (isInr ? '' : this.config.get<string>('NEXT_PUBLIC_GBP_BANK_DETAILS', '')),
        qrUrl:
          setting?.qrUrl ??
          this.config.get<string>(
            isInr ? 'NEXT_PUBLIC_INR_PAYMENT_QR_URL' : 'NEXT_PUBLIC_GBP_BANK_QR_URL',
            isInr ? '/payments/inr-payment.jpeg' : '/payments/gbp-payment.jpeg',
          ),
        amounts: {
          PREMIUM: setting?.premiumAmount ?? (isInr ? 1599 : 15),
          PRO: setting?.proAmount ?? (isInr ? 2999 : 29),
        },
      };
    });
  }

  async updateManualPaymentSettings(
    adminId: string,
    dto: UpdateManualPaymentSettingsDto,
    ipAddress?: string,
  ) {
    const existing = await this.prisma.manualPaymentSettings.findUnique({
      where: { currency: dto.currency },
    });
    const updated = await this.prisma.manualPaymentSettings.upsert({
      where: { currency: dto.currency },
      create: {
        currency: dto.currency,
        methodLabel: dto.methodLabel.trim(),
        paymentDetails: dto.paymentDetails?.trim() ?? '',
        qrUrl: dto.qrUrl?.trim() ?? '',
        premiumAmount: dto.premiumAmount,
        proAmount: dto.proAmount,
      },
      update: {
        methodLabel: dto.methodLabel.trim(),
        paymentDetails: dto.paymentDetails?.trim() ?? '',
        qrUrl: dto.qrUrl?.trim() ?? '',
        premiumAmount: dto.premiumAmount,
        proAmount: dto.proAmount,
      },
    });
    await this.audit(
      adminId,
      'ADMIN_UPDATE_MANUAL_PAYMENT_SETTINGS',
      'ManualPaymentSettings',
      dto.currency,
      existing ?? undefined,
      updated,
      undefined,
      ipAddress,
    );
    return updated;
  }

  async getManualPaymentMethods() {
    return this.prisma.manualPaymentMethod.findMany({
      orderBy: [{ currency: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createManualPaymentMethod(
    adminId: string,
    dto: CreateManualPaymentMethodDto,
    ipAddress?: string,
  ) {
    const method = await this.prisma.manualPaymentMethod.create({
      data: {
        currency: dto.currency,
        label: dto.label.trim(),
        paymentDetails: dto.paymentDetails?.trim() ?? '',
        qrUrl: dto.qrUrl?.trim() ?? '',
        enabled: dto.enabled ?? true,
      },
    });
    await this.audit(
      adminId,
      'ADMIN_CREATE_PAYMENT_METHOD',
      'ManualPaymentMethod',
      method.id,
      undefined,
      method,
      undefined,
      ipAddress,
    );
    return method;
  }

  async updateManualPaymentMethod(
    adminId: string,
    id: string,
    dto: UpdateManualPaymentMethodDto,
    ipAddress?: string,
  ) {
    const existing = await this.prisma.manualPaymentMethod.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Payment method not found.');
    const updated = await this.prisma.manualPaymentMethod.update({
      where: { id },
      data: {
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
        ...(dto.paymentDetails !== undefined ? { paymentDetails: dto.paymentDetails.trim() } : {}),
        ...(dto.qrUrl !== undefined ? { qrUrl: dto.qrUrl.trim() } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
      },
    });
    await this.audit(
      adminId,
      'ADMIN_UPDATE_PAYMENT_METHOD',
      'ManualPaymentMethod',
      id,
      existing,
      updated,
      undefined,
      ipAddress,
    );
    return updated;
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

    const [recentPayments, totalRevAggregate, subsByStatus, topPlans] = await Promise.all([
      this.prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          subscription: {
            include: { user: { select: { email: true, fullName: true } }, plan: true },
          },
        },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'succeeded' },
        _sum: { amount: true },
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
      { month: string; revenue: number; count: number }[]
    >`
      SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon YYYY') AS month,
             SUM(amount)::float AS revenue,
             COUNT(*)::int AS count
      FROM "Payment"
      WHERE status = 'succeeded' AND "createdAt" >= ${ago6m}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY DATE_TRUNC('month', "createdAt") ASC
    `.catch(() => []);

    return {
      recentPayments,
      totalRevenue: Math.round((totalRevAggregate._sum.amount ?? 0) * 100) / 100,
      totalPayments: totalRevAggregate._count.id,
      subsByStatus,
      topPlans,
      revenueByMonth,
    };
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
      const where: any = {};
      if (dto.audience === 'ACTIVE') where.status = 'ACTIVE';
      if (dto.audience === 'SUSPENDED') where.status = 'SUSPENDED';
      if (dto.audience === 'PREMIUM') {
        where.subscriptions = { some: { status: 'ACTIVE' } };
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
