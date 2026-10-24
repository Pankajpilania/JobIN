import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from './billing.service';

describe('BillingService customer portal', () => {
  let config: { get: jest.Mock };
  let prisma: { user: { findUnique: jest.Mock } };
  let service: BillingService;

  beforeEach(() => {
    config = { get: jest.fn((key: string, fallback?: string) => fallback) };
    prisma = { user: { findUnique: jest.fn() } };
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
});
