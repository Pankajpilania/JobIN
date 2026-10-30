import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    prisma.stripePriceConfig.findMany.mockResolvedValue([
      {
        currency: 'INR',
        interval: 'MONTHLY',
        plan: { name: 'PREMIUM' },
      },
      {
        currency: 'GBP',
        interval: 'YEARLY',
        plan: { name: 'PRO' },
      },
    ]);

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
