import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from './billing.service';

describe('BillingService customer portal', () => {
  let config: { get: jest.Mock };
  let prisma: {
    user: { findUnique: jest.Mock };
    plan: { findUnique: jest.Mock; findFirst: jest.Mock };
    stripePriceConfig: { findUnique: jest.Mock; findMany: jest.Mock };
    subscription: { findFirst: jest.Mock; create: jest.Mock };
    aIUsage: { aggregate: jest.Mock };
  };
  let service: BillingService;

  beforeEach(() => {
    config = { get: jest.fn((key: string, fallback?: string) => fallback) };
    prisma = {
      user: { findUnique: jest.fn() },
      plan: { findUnique: jest.fn(), findFirst: jest.fn().mockResolvedValue(null) },
      stripePriceConfig: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      subscription: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'db-subscription' }),
      },
      aIUsage: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { creditUnits: 0, totalTokens: 0, estimatedCostUsd: 0 },
        }),
      },
    };
    service = new BillingService(
      config as unknown as ConfigService,
      prisma as unknown as PrismaService,
    );
  });

  it('explains that Stripe must be configured when the API key is missing', async () => {
    config.get.mockImplementation((key: string, fallback?: string) =>
      key === 'STRIPE_SECRET_KEY' ? '' : fallback,
    );
    prisma.user.findUnique.mockResolvedValue({
      subscriptions: [{ isComplimentary: false, stripeSubscriptionId: 'sub_123' }],
    });

    await expect(service.createPortalSession('supabase-user-id')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('does not send admin-managed plans to the Stripe portal', async () => {
    prisma.user.findUnique.mockResolvedValue({
      subscriptions: [{ isComplimentary: true, stripeSubscriptionId: 'admin_123' }],
    });

    await expect(service.createPortalSession('supabase-user-id')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('enables Stripe Checkout codes and always collects a payment method', async () => {
    config.get.mockImplementation((key: string, fallback?: string) =>
      key === 'STRIPE_SECRET_KEY' ? 'sk_test_dummy' : fallback,
    );
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'user@example.com', subscriptions: [] });
    prisma.plan.findUnique.mockResolvedValue({ id: 'plan-1', isActive: true });
    prisma.stripePriceConfig.findUnique.mockResolvedValue({ stripePriceId: 'price_test' });
    const createSession = jest.spyOn(service['stripe'].checkout.sessions, 'create').mockResolvedValue({
      id: 'cs_test_1', url: 'https://checkout.stripe.test/session',
    } as Stripe.Response<Stripe.Checkout.Session>);

    await expect(service.createCheckoutSession('supabase-1', {
      plan: 'PREMIUM', currency: 'GBP', interval: 'MONTHLY',
    })).resolves.toEqual({ url: 'https://checkout.stripe.test/session', sessionId: 'cs_test_1' });
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({
      allow_promotion_codes: true,
      payment_method_collection: 'always',
      mode: 'subscription',
    }));
  });

  it('activates a subscription from a completed zero-total Checkout webhook', async () => {
    prisma.stripePriceConfig.findUnique.mockResolvedValue({
      plan: { id: 'plan-1' },
    });
    jest.spyOn(service['stripe'].webhooks, 'constructEvent').mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: {
        mode: 'subscription', subscription: 'sub_zero_total',
        payment_status: 'no_payment_required', metadata: { userId: 'user-1' },
      } },
    } as Stripe.Event);
    jest.spyOn(service['stripe'].subscriptions, 'retrieve').mockResolvedValue({
      id: 'sub_zero_total', status: 'active', current_period_start: 1_800_000_000,
      current_period_end: 1_802_592_000, cancel_at_period_end: false,
      items: { data: [{ price: { id: 'price_test' } }] },
    } as unknown as Stripe.Response<Stripe.Subscription>);

    await expect(service.handleWebhook(Buffer.from('event'), 'signature')).resolves.toEqual({ received: true });
    expect(prisma.subscription.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'user-1', planId: 'plan-1', stripeSubscriptionId: 'sub_zero_total', status: 'ACTIVE',
      }),
    }));
  });

  it('only advertises currencies and intervals with active configured Stripe prices', async () => {
    config.get.mockImplementation((key: string, fallback?: string) =>
      key === 'STRIPE_SECRET_KEY' ? 'sk_test' : fallback,
    );
    prisma.stripePriceConfig.findMany.mockResolvedValue([
      {
        stripePriceId: 'price_inr_monthly',
        currency: 'INR',
        interval: 'MONTHLY',
        plan: { name: 'PREMIUM' },
      },
      {
        stripePriceId: 'price_gbp_yearly',
        currency: 'GBP',
        interval: 'YEARLY',
        plan: { name: 'PRO' },
      },
    ]);
    jest.spyOn(service['stripe'].prices, 'retrieve').mockImplementation(async (id) => {
      const inrPrice = id === 'price_inr_monthly';
      return {
        id,
        active: true,
        type: 'recurring',
        currency: inrPrice ? 'inr' : 'gbp',
        recurring: {
          interval: inrPrice ? 'month' : 'year',
          interval_count: 1,
        },
        unit_amount: inrPrice ? 89999 : 20000,
      } as Stripe.Response<Stripe.Price>;
    });

    await expect(service.getCheckoutOptions()).resolves.toEqual({
      currencies: ['INR', 'GBP'],
      stripeCheckout: {
        INR: {
          PREMIUM: { MONTHLY: true, YEARLY: false },
          PRO: { MONTHLY: false, YEARLY: false },
        },
        GBP: {
          PREMIUM: { MONTHLY: false, YEARLY: false },
          PRO: { MONTHLY: false, YEARLY: true },
        },
      },
      prices: [
        {
          plan: 'PREMIUM',
          currency: 'INR',
          interval: 'MONTHLY',
          unitAmount: 89999,
        },
        {
          plan: 'PRO',
          currency: 'GBP',
          interval: 'YEARLY',
          unitAmount: 20000,
        },
      ],
    });
  });

  it('does not advertise a configured one-time Stripe price as subscription checkout', async () => {
    config.get.mockImplementation((key: string, fallback?: string) =>
      key === 'STRIPE_SECRET_KEY' ? 'sk_test' : fallback,
    );
    prisma.stripePriceConfig.findMany.mockResolvedValue([
      {
        stripePriceId: 'price_one_time',
        currency: 'INR',
        interval: 'YEARLY',
        plan: { name: 'PRO' },
      },
    ]);
    jest.spyOn(service['stripe'].prices, 'retrieve').mockResolvedValue({
      id: 'price_one_time',
      active: true,
      type: 'one_time',
      currency: 'inr',
      recurring: null,
      unit_amount: 1599999,
    } as Stripe.Response<Stripe.Price>);

    await expect(service.getCheckoutOptions()).resolves.toEqual({
      currencies: [],
      stripeCheckout: {},
      prices: [],
    });
  });

  it('lets customers with past-due Stripe subscriptions access the billing portal', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-123',
      subscriptions: [
        {
          status: 'PAST_DUE',
          isComplimentary: false,
          stripeSubscriptionId: 'sub_123',
          currentPeriodStart: new Date('2026-01-01T00:00:00Z'),
          currentPeriodEnd: new Date('2026-02-01T00:00:00Z'),
          plan: { name: 'PREMIUM', features: [{ value: '100' }] },
        },
      ],
    });

    await expect(service.getUsageSummary('supabase-user-id')).resolves.toMatchObject({
      planName: 'PREMIUM',
      hasActiveSubscription: false,
      canManagePlan: true,
    });
  });
});
