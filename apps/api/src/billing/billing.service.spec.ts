import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from './billing.service';

describe('BillingService customer portal', () => {
  let config: { get: jest.Mock };
  let prisma: {
    user: { findUnique: jest.Mock };
    stripePriceConfig: { findMany: jest.Mock };
    aIUsage: { aggregate: jest.Mock };
  };
  let service: BillingService;

  beforeEach(() => {
    config = { get: jest.fn((key: string, fallback?: string) => fallback) };
    prisma = {
      user: { findUnique: jest.fn() },
      stripePriceConfig: { findMany: jest.fn().mockResolvedValue([]) },
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
