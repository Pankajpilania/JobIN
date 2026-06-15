import {
  Injectable, Logger, NotFoundException,
  BadRequestException, InternalServerErrorException,
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
    private readonly config:  ConfigService,
    private readonly prisma:  PrismaService,
  ) {
    this.stripe = new Stripe(config.get<string>('STRIPE_SECRET_KEY', ''), {
      apiVersion: '2024-06-20' as any,
    });
  }

  // ─── Resolve user helpers ─────────────────────────────────────────────────

  private async resolveUser(supabaseId: string) {
    const user = await this.prisma.user.findUnique({
      where:   { supabaseId },
      include: { subscriptions: { include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private priceId(interval: BillingInterval): string {
    return interval === BillingInterval.MONTHLY
      ? this.config.get<string>('STRIPE_PRICE_PREMIUM_MONTHLY', '')
      : this.config.get<string>('STRIPE_PRICE_PREMIUM_YEARLY', '');
  }

  // ─── Checkout session ─────────────────────────────────────────────────────

  async createCheckoutSession(supabaseId: string, dto: CreateCheckoutDto) {
    const user   = await this.resolveUser(supabaseId);
    const priceId = this.priceId(dto.interval);

    if (!priceId) throw new BadRequestException('Stripe price not configured. Set STRIPE_PRICE_PREMIUM_MONTHLY / YEARLY in .env');

    const appUrl     = this.config.get<string>('NEXT_PUBLIC_URL', 'http://localhost:3000');
    const successUrl = dto.successUrl ?? `${appUrl}/dashboard?upgraded=true`;
    const cancelUrl  = dto.cancelUrl  ?? `${appUrl}/settings?cancelled=true`;

    try {
      const session = await this.stripe.checkout.sessions.create({
        mode:      'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url:  cancelUrl,
        client_reference_id: user.id,
        customer_email: user.email,
        metadata:  { userId: user.id, supabaseId },
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
    const sub  = user.subscriptions[0];
    if (!sub) throw new BadRequestException('No active subscription found');

    const appUrl = this.config.get<string>('NEXT_PUBLIC_URL', 'http://localhost:3000');

    // Retrieve the Stripe customer from the subscription
    const stripeSub = await this.stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
    const customerId = stripeSub.customer as string;

    const session = await this.stripe.billingPortal.sessions.create({
      customer:   customerId,
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
      data:  { status: 'CANCELLED', cancelAtPeriodEnd: true },
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
        where:  { stripeIntentId: invoice.payment_intent as string },
        create: {
          subscriptionId: sub.id,
          stripeIntentId: invoice.payment_intent as string,
          amount:   invoice.amount_paid / 100,
          currency: invoice.currency.toUpperCase(),
          status:   'succeeded',
        },
        update: { status: 'succeeded' },
      });
    }

    // Record invoice
    if (invoice.hosted_invoice_url) {
      await this.prisma.invoice.upsert({
        where:  { stripeInvoiceId: invoice.id },
        create: {
          subscriptionId:  sub.id,
          stripeInvoiceId: invoice.id,
          invoiceUrl:      invoice.hosted_invoice_url ?? '',
          pdfUrl:          invoice.invoice_pdf         ?? '',
        },
        update: {
          invoiceUrl: invoice.hosted_invoice_url ?? '',
          pdfUrl:     invoice.invoice_pdf ?? '',
        },
      });
    }
  }

  private async onInvoiceFailed(invoice: Stripe.Invoice) {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data:  { status: 'PAST_DUE' },
    });
    this.logger.warn(`Invoice payment failed for subscription ${subscriptionId}`);
  }

  // ─── Upsert subscription in DB ────────────────────────────────────────────

  private async upsertSubscription(userId: string, stripeSub: Stripe.Subscription) {
    const priceId = stripeSub.items.data[0]?.price.id;

    // Find the matching plan by stripePriceId
    const plan = await this.prisma.plan.findFirst({ where: { stripePriceId: priceId } });
    if (!plan) {
      this.logger.warn(`No plan found for Stripe price ${priceId}. Skipping subscription upsert.`);
      return;
    }

    const stripeStatus = stripeSub.status;
    const dbStatus: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PAST_DUE' =
      stripeStatus === 'active'   ? 'ACTIVE'   :
      stripeStatus === 'canceled' ? 'CANCELLED' :
      stripeStatus === 'past_due' ? 'PAST_DUE'  :
      'EXPIRED';

    const existing = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSub.id },
    });

    if (existing) {
      await this.prisma.subscription.update({
        where: { id: existing.id },
        data:  {
          planId:             plan.id,
          status:             dbStatus,
          currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
          currentPeriodEnd:   new Date(stripeSub.current_period_end   * 1000),
          cancelAtPeriodEnd:  stripeSub.cancel_at_period_end,
        },
      });
    } else {
      await this.prisma.subscription.create({
        data: {
          userId,
          planId:              plan.id,
          stripeSubscriptionId: stripeSub.id,
          status:              dbStatus,
          currentPeriodStart:  new Date(stripeSub.current_period_start * 1000),
          currentPeriodEnd:    new Date(stripeSub.current_period_end   * 1000),
          cancelAtPeriodEnd:   stripeSub.cancel_at_period_end,
        },
      });
    }

    this.logger.log(`Subscription ${stripeSub.id} upserted for user ${userId} — status: ${dbStatus}`);
  }
}
