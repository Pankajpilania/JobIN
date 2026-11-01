import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

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
          where: { status: { in: ['ACTIVE', 'PAST_DUE'] } },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
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
          where: { status: { in: ['ACTIVE', 'PAST_DUE'] } },
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
      hasActiveSubscription: subscription?.status === 'ACTIVE',
      canManagePlan: Boolean(
        subscription &&
        !subscription.isComplimentary &&
        subscription.stripeSubscriptionId.startsWith('sub_') &&
        ['ACTIVE', 'PAST_DUE'].includes(subscription.status),
      ),
    };
  }

  async getCheckoutOptions() {
    const configuredPrices = await this.prisma.stripePriceConfig.findMany({
      where: { plan: { isActive: true } },
      include: { plan: { select: { name: true } } },
    });
    const stripeSecretKey = this.config.get<string>('STRIPE_SECRET_KEY')?.trim();
    if (configuredPrices.length && !stripeSecretKey) {
      throw new ServiceUnavailableException(
        'Stripe billing is not configured on the API. Please contact the JobIN administrator.',
      );
    }

    const verifiedPrices = (
      await Promise.all(
        configuredPrices.map(async (configuredPrice) => {
          let stripePrice: Stripe.Price;
          try {
            stripePrice = await this.stripe.prices.retrieve(configuredPrice.stripePriceId);
          } catch (error) {
            const errorType = error instanceof Error ? error.name : 'unknown error';
            this.logger.error(`Stripe Price lookup failed (${errorType}).`);
            throw new ServiceUnavailableException(
              'Could not load Stripe prices. Please try again later.',
            );
          }

          const expectedInterval =
            configuredPrice.interval === 'MONTHLY'
              ? 'month'
              : configuredPrice.interval === 'YEARLY'
                ? 'year'
                : null;
          if (
            !stripePrice.active ||
            stripePrice.type !== 'recurring' ||
            !stripePrice.recurring ||
            stripePrice.recurring.interval !== expectedInterval ||
            stripePrice.recurring.interval_count !== 1 ||
            stripePrice.currency.toUpperCase() !== configuredPrice.currency ||
            stripePrice.unit_amount === null
          ) {
            this.logger.warn(
              `Ignoring invalid Stripe Price configuration (${configuredPrice.stripePriceId}).`,
            );
            return null;
          }

          return {
            plan: configuredPrice.plan.name,
            currency: configuredPrice.currency,
            interval: configuredPrice.interval,
            unitAmount: stripePrice.unit_amount,
          };
        }),
      )
    ).filter((price): price is NonNullable<typeof price> => price !== null);

    const currencies = ['INR', 'GBP'].filter((currency) =>
      verifiedPrices.some((price) => price.currency === currency),
    );
    const stripeCheckout = Object.fromEntries(
      currencies.map((currency) => [
        currency,
        Object.fromEntries(
          (['PREMIUM', 'PRO'] as const).map((plan) => [
            plan,
            Object.fromEntries(
              (['MONTHLY', 'YEARLY'] as const).map((interval) => [
                interval,
                verifiedPrices.some(
                  (price) =>
                    price.currency === currency &&
                    price.plan === plan &&
                    price.interval === interval,
                ),
              ]),
            ),
          ]),
        ),
      ]),
    );
    return { currencies, stripeCheckout, prices: verifiedPrices };
  }

  // ─── Checkout session ─────────────────────────────────────────────────────

  async createCheckoutSession(supabaseId: string, dto: CreateCheckoutDto) {
    if (!this.config.get<string>('STRIPE_SECRET_KEY')?.trim()) {
      throw new ServiceUnavailableException(
        'Stripe billing is not configured on the API. Please contact the JobIN administrator.',
      );
    }
    const user = await this.resolveUser(supabaseId);
    if (
      user.subscriptions.some(
        (subscription) =>
          !subscription.isComplimentary &&
          subscription.stripeSubscriptionId.startsWith('sub_') &&
          ['ACTIVE', 'PAST_DUE'].includes(subscription.status),
      )
    ) {
      throw new ConflictException(
        'You already have an active Stripe subscription. Manage it from your billing settings.',
      );
    }
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
    const priceId = priceConfig?.stripePriceId;

    if (!priceId)
      throw new BadRequestException(
        'Stripe Checkout is not configured for this plan, currency, and billing interval.',
      );

    const appUrl = this.config
      .get<string>('NEXT_PUBLIC_URL', 'http://localhost:3000')
      .replace(/\/+$/, '');
    const appOrigin = new URL(appUrl);
    if (this.config.get<string>('NODE_ENV') === 'production' && appOrigin.protocol !== 'https:') {
      throw new ServiceUnavailableException('Stripe checkout requires an HTTPS application URL.');
    }

    try {
      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appOrigin.origin}/upgrade?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appOrigin.origin}/upgrade?checkout=cancelled`,
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
    const sub = user.subscriptions.find(
      (subscription) =>
        !subscription.isComplimentary && subscription.stripeSubscriptionId.startsWith('sub_'),
    );
    if (!sub) throw new BadRequestException('No Stripe subscription to manage was found.');
    if (!this.config.get<string>('STRIPE_SECRET_KEY')?.trim()) {
      throw new ServiceUnavailableException(
        'Stripe billing is not configured on the API. Please contact the JobIN administrator.',
      );
    }

    const appUrl = this.config
      .get<string>('NEXT_PUBLIC_URL', 'http://localhost:3000')
      .replace(/\/+$/, '');
    const appOrigin = new URL(appUrl);

    try {
      const stripeSub = await this.stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
      const customerId = stripeSub.customer as string;
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${appOrigin.origin}/settings`,
      });
      return { url: session.url };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const errorType = error instanceof Error ? error.name : 'unknown error';
      this.logger.error(`Failed to create Stripe billing portal session (${errorType}).`);
      if (/api key|authentication/i.test(message)) {
        throw new ServiceUnavailableException(
          'Stripe rejected the API credentials. Ask the JobIN administrator to check STRIPE_SECRET_KEY.',
        );
      }
      throw new InternalServerErrorException('Could not open Stripe billing management.');
    }
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
        update: {
          amount: invoice.amount_paid / 100,
          currency: invoice.currency.toUpperCase(),
          status: 'succeeded',
        },
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
          amountPaid: invoice.amount_paid / 100,
          currency: invoice.currency.toUpperCase(),
        },
        update: {
          invoiceUrl: invoice.hosted_invoice_url ?? '',
          pdfUrl: invoice.invoice_pdf ?? '',
          amountPaid: invoice.amount_paid / 100,
          currency: invoice.currency.toUpperCase(),
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
    const existing = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSub.id },
      include: { plan: true },
    });
    const legacyPlan = priceId
      ? await this.prisma.plan.findFirst({ where: { stripePriceId: priceId } })
      : null;
    const plan = configuredPrice?.plan ?? legacyPlan ?? existing?.plan ?? null;
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
