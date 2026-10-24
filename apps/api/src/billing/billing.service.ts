import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckoutDto, BillingInterval } from './dto/create-checkout.dto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.stripe = new Stripe(config.get<string>('STRIPE_SECRET_KEY', ''), {
      apiVersion: '2024-06-20' as any,
    });
  }

  // ─── Resolve user helpers ─────────────────────────────────────────────────

  private async resolveUser(supabaseId: string) {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getUsageSummary(supabaseId: string) {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: {
            plan: { include: { features: { where: { featureKey: 'ai_credits_monthly' } } } },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const subscription = user.subscriptions[0];
    const periodStart =
      subscription?.currentPeriodStart ??
      new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
    const periodEnd =
      subscription?.currentPeriodEnd ??
      new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1));
    const usage = await this.prisma.aIUsage.aggregate({
      where: {
        userId: user.id,
        createdAt: { gte: periodStart, lt: periodEnd },
      },
      _sum: { creditUnits: true, totalTokens: true, estimatedCostUsd: true },
    });

    const allowanceValue = subscription?.plan.features[0]?.value ?? '20';
    const parsedAllowance = Number.parseInt(allowanceValue, 10);
    const creditsIncluded = Number.isFinite(parsedAllowance) ? parsedAllowance : 20;
    const creditsUsed = usage._sum.creditUnits ?? 0;

    return {
      planName: subscription?.plan.name ?? 'FREE',
      creditsUsed,
      creditsIncluded: creditsIncluded < 0 ? null : creditsIncluded,
      creditsRemaining: creditsIncluded < 0 ? null : Math.max(creditsIncluded - creditsUsed, 0),
      totalTokens: usage._sum.totalTokens ?? 0,
      estimatedCostUsd: usage._sum.estimatedCostUsd ?? 0,
      periodStart,
      periodEnd,
      hasActiveSubscription: Boolean(subscription),
    };
  }

  async getManualPaymentSettings() {
    const [stored, methods, stripePrices] = await Promise.all([
      this.prisma.manualPaymentSettings.findMany(),
      this.prisma.manualPaymentMethod.findMany({ where: { enabled: true } }),
      this.prisma.stripePriceConfig.findMany({ include: { plan: { select: { name: true } } } }),
    ]);
    const byCurrency = new Map(stored.map((setting) => [setting.currency, setting]));
    return (['INR', 'GBP'] as const).map((currency) => {
      const setting = byCurrency.get(currency);
      const isInr = currency === 'INR';
      const configuredPrices = stripePrices.filter((price) => price.currency === currency);
      return {
        currency,
        methods: methods
          .filter((method) => method.currency === currency)
          .map(({ id, label, paymentDetails, qrUrl }) => ({
            id,
            label,
            paymentDetails:
              paymentDetails ||
              (isInr ? '' : this.config.get<string>('NEXT_PUBLIC_GBP_BANK_DETAILS', '')),
            qrUrl:
              qrUrl ||
              this.config.get<string>(
                isInr ? 'NEXT_PUBLIC_INR_PAYMENT_QR_URL' : 'NEXT_PUBLIC_GBP_BANK_QR_URL',
                isInr ? '/payments/inr-payment.jpeg' : '/payments/gbp-payment.jpeg',
              ),
          })),
        amounts: {
          PREMIUM: setting?.premiumAmount ?? (isInr ? 1599 : 15),
          PRO: setting?.proAmount ?? (isInr ? 2999 : 29),
        },
        stripeCheckout: {
          PREMIUM: {
            MONTHLY:
              configuredPrices.some(
                (price) => price.plan.name === 'PREMIUM' && price.interval === 'MONTHLY',
              ) || Boolean(this.legacyPriceId('PREMIUM', currency, BillingInterval.MONTHLY)),
            YEARLY:
              configuredPrices.some(
                (price) => price.plan.name === 'PREMIUM' && price.interval === 'YEARLY',
              ) || Boolean(this.legacyPriceId('PREMIUM', currency, BillingInterval.YEARLY)),
          },
          PRO: {
            MONTHLY: configuredPrices.some(
              (price) => price.plan.name === 'PRO' && price.interval === 'MONTHLY',
            ),
            YEARLY: configuredPrices.some(
              (price) => price.plan.name === 'PRO' && price.interval === 'YEARLY',
            ),
          },
        },
      };
    });
  }

  private legacyPriceId(plan: string, currency: string, interval: BillingInterval): string {
    if (plan !== 'PREMIUM' || currency !== 'GBP') return '';
    return interval === BillingInterval.MONTHLY
      ? this.config.get<string>('STRIPE_PRICE_PREMIUM_MONTHLY', '')
      : this.config.get<string>('STRIPE_PRICE_PREMIUM_YEARLY', '');
  }

  async createManualPaymentRequest(
    supabaseId: string,
    dto: {
      plan: 'PREMIUM' | 'PRO';
      currency: 'GBP' | 'INR';
      transactionReference: string;
      paymentMethodId?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new NotFoundException('User not found.');

    const plan = await this.prisma.plan.findUnique({ where: { name: dto.plan } });
    if (!plan?.isActive) throw new NotFoundException('The selected plan is not available.');

    const paymentMethod = dto.paymentMethodId
      ? await this.prisma.manualPaymentMethod.findFirst({
          where: { id: dto.paymentMethodId, currency: dto.currency, enabled: true },
        })
      : await this.prisma.manualPaymentMethod.findFirst({
          where: { currency: dto.currency, enabled: true },
          orderBy: { createdAt: 'asc' },
        });
    if (dto.paymentMethodId && !paymentMethod) {
      throw new NotFoundException('The selected payment method is no longer available.');
    }

    const paymentSettings = await this.prisma.manualPaymentSettings.findUnique({
      where: { currency: dto.currency },
    });
    const amount =
      dto.plan === 'PREMIUM'
        ? (paymentSettings?.premiumAmount ?? (dto.currency === 'INR' ? 1599 : 15))
        : (paymentSettings?.proAmount ?? (dto.currency === 'INR' ? 2999 : 29));
    const pending = await this.prisma.manualPaymentRequest.findFirst({
      where: { userId: user.id, status: 'PENDING' },
      select: { id: true },
    });
    if (pending) {
      throw new ConflictException('You already have a payment awaiting review.');
    }

    return this.prisma.manualPaymentRequest.create({
      data: {
        userId: user.id,
        planId: plan.id,
        currency: dto.currency,
        amount,
        paymentMethodLabel: paymentMethod?.label,
        transactionReference: dto.transactionReference.trim(),
      },
      select: { id: true, status: true, createdAt: true },
    });
  }

  async listMyManualPaymentRequests(supabaseId: string) {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found.');
    return this.prisma.manualPaymentRequest.findMany({
      where: { userId: user.id },
      include: { plan: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  async listManualPaymentRequests(status = 'PENDING') {
    return this.prisma.manualPaymentRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        plan: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  async reviewManualPaymentRequest(requestId: string, adminId: string, approve: boolean) {
    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.manualPaymentRequest.findUnique({
        where: { id: requestId },
      });
      if (!request) throw new NotFoundException('Payment request not found.');
      if (request.status !== 'PENDING') {
        throw new ConflictException('This payment request has already been reviewed.');
      }

      const now = new Date();
      const updated = await transaction.manualPaymentRequest.update({
        where: { id: requestId },
        data: {
          status: approve ? 'APPROVED' : 'REJECTED',
          reviewedAt: now,
          reviewedBy: adminId,
        },
      });

      if (approve) {
        await transaction.subscription.updateMany({
          where: { userId: request.userId, status: 'ACTIVE' },
          data: { status: 'CANCELLED' },
        });
        const subscription = await transaction.subscription.create({
          data: {
            userId: request.userId,
            planId: request.planId,
            status: 'ACTIVE',
            stripeSubscriptionId: `manual-${request.id}`,
            currentPeriodStart: now,
            currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
            isComplimentary: false,
          },
        });
        await transaction.payment.create({
          data: {
            subscriptionId: subscription.id,
            stripeIntentId: `manual-${request.id}`,
            amount: request.amount,
            currency: request.currency,
            status: 'succeeded',
          },
        });
      }
      return updated;
    });
  }

  // ─── Checkout session ─────────────────────────────────────────────────────

  async createCheckoutSession(supabaseId: string, dto: CreateCheckoutDto) {
    const user = await this.resolveUser(supabaseId);
    const plan = await this.prisma.plan.findUnique({ where: { name: dto.plan } });
    if (!plan?.isActive) throw new NotFoundException('The selected plan is not available.');
    const priceConfig = await this.prisma.stripePriceConfig.findUnique({
      where: {
        planId_currency_interval: {
          planId: plan.id,
          currency: dto.currency,
          interval: dto.interval,
        },
      },
    });
    const priceId =
      priceConfig?.stripePriceId ?? this.legacyPriceId(dto.plan, dto.currency, dto.interval);

    if (!priceId)
      throw new BadRequestException(
        'Stripe Checkout is not configured for this plan, currency, and billing interval.',
      );

    const appUrl = this.config.get<string>('NEXT_PUBLIC_URL', 'http://localhost:3000');
    const successUrl = dto.successUrl ?? `${appUrl}/dashboard?upgraded=true`;
    const cancelUrl = dto.cancelUrl ?? `${appUrl}/settings?cancelled=true`;

    try {
      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: user.id,
        customer_email: user.email,
        metadata: { userId: user.id, supabaseId },
        subscription_data: {
          metadata: { userId: user.id, supabaseId },
        },
        allow_promotion_codes: true,
      });

      this.logger.log(`Checkout session created for user ${user.id}: ${session.id}`);
      return { url: session.url, sessionId: session.id };
    } catch (err: any) {
      this.logger.error(`Failed to create checkout: ${err.message}`);
      throw new InternalServerErrorException('Could not create checkout session');
    }
  }

  // ─── Customer portal ──────────────────────────────────────────────────────

  async createPortalSession(supabaseId: string) {
    const user = await this.resolveUser(supabaseId);
    const sub = user.subscriptions[0];
    if (!sub) throw new BadRequestException('No active subscription found');

    const appUrl = this.config.get<string>('NEXT_PUBLIC_URL', 'http://localhost:3000');

    // Retrieve the Stripe customer from the subscription
    const stripeSub = await this.stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
    const customerId = stripeSub.customer as string;

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/settings`,
    });

    return { url: session.url };
  }

  // ─── Webhook handler ──────────────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string): Promise<{ received: boolean }> {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET', '');
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook signature invalid: ${err.message}`);
    }

    this.logger.log(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.onSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.onSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await this.onInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.onInvoiceFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        this.logger.log(`Unhandled webhook event type: ${event.type}`);
    }

    return { received: true };
  }

  // ─── Webhook sub-handlers ─────────────────────────────────────────────────

  private async onCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    if (!userId) return;

    if (session.mode === 'subscription' && session.subscription) {
      const stripeSub = await this.stripe.subscriptions.retrieve(session.subscription as string);
      await this.upsertSubscription(userId, stripeSub);
    }
  }

  private async onSubscriptionUpdated(stripeSub: Stripe.Subscription) {
    const userId = stripeSub.metadata?.userId;
    if (!userId) return;
    await this.upsertSubscription(userId, stripeSub);
  }

  private async onSubscriptionDeleted(stripeSub: Stripe.Subscription) {
    const userId = stripeSub.metadata?.userId;
    if (!userId) return;

    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: stripeSub.id },
      data: { status: 'CANCELLED', cancelAtPeriodEnd: true },
    });
    this.logger.log(`Subscription ${stripeSub.id} cancelled for user ${userId}`);
  }

  private async onInvoicePaid(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    const sub = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });
    if (!sub) return;

    // Record payment
    if (invoice.payment_intent) {
      await this.prisma.payment.upsert({
        where: { stripeIntentId: invoice.payment_intent as string },
        create: {
          subscriptionId: sub.id,
          stripeIntentId: invoice.payment_intent as string,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency.toUpperCase(),
          status: 'succeeded',
        },
        update: { status: 'succeeded' },
      });
    }

    // Record invoice
    if (invoice.hosted_invoice_url) {
      await this.prisma.invoice.upsert({
        where: { stripeInvoiceId: invoice.id },
        create: {
          subscriptionId: sub.id,
          stripeInvoiceId: invoice.id,
          invoiceUrl: invoice.hosted_invoice_url ?? '',
          pdfUrl: invoice.invoice_pdf ?? '',
        },
        update: {
          invoiceUrl: invoice.hosted_invoice_url ?? '',
          pdfUrl: invoice.invoice_pdf ?? '',
        },
      });
    }
  }

  private async onInvoiceFailed(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: 'PAST_DUE' },
    });
    this.logger.warn(`Invoice payment failed for subscription ${subscriptionId}`);
  }

  // ─── Upsert subscription in DB ────────────────────────────────────────────

  private async upsertSubscription(userId: string, stripeSub: Stripe.Subscription) {
    const priceId = stripeSub.items.data[0]?.price.id;

    const configuredPrice = priceId
      ? await this.prisma.stripePriceConfig.findUnique({
          where: { stripePriceId: priceId },
          include: { plan: true },
        })
      : null;
    const plan =
      configuredPrice?.plan ??
      (await this.prisma.plan.findFirst({ where: { stripePriceId: priceId } }));
    if (!plan) {
      this.logger.warn(`No plan found for Stripe price ${priceId}. Skipping subscription upsert.`);
      return;
    }

    const stripeStatus = stripeSub.status;
    const dbStatus: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PAST_DUE' =
      stripeStatus === 'active'
        ? 'ACTIVE'
        : stripeStatus === 'canceled'
          ? 'CANCELLED'
          : stripeStatus === 'past_due'
            ? 'PAST_DUE'
            : 'EXPIRED';

    const existing = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSub.id },
    });

    if (existing) {
      await this.prisma.subscription.update({
        where: { id: existing.id },
        data: {
          planId: plan.id,
          status: dbStatus,
          currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        },
      });
    } else {
      await this.prisma.subscription.create({
        data: {
          userId,
          planId: plan.id,
          stripeSubscriptionId: stripeSub.id,
          status: dbStatus,
          currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        },
      });
    }

    this.logger.log(
      `Subscription ${stripeSub.id} upserted for user ${userId} — status: ${dbStatus}`,
    );
  }
}
