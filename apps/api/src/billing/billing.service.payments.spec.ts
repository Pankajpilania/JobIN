import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from './billing.service';

describe('BillingService payment event synchronization', () => {
  let prisma: any;
  let service: BillingService;

  beforeEach(() => {
    prisma = {
      subscription: {
        findUnique: jest.fn().mockResolvedValue({ id: 'local-subscription' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      payment: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'local-payment' }),
        update: jest.fn().mockResolvedValue({ id: 'local-payment' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const config = {
      get: jest.fn((key: string, fallback?: string) =>
        key === 'STRIPE_SECRET_KEY' ? 'sk_test_dummy' : fallback,
      ),
    };
    service = new BillingService(config as unknown as ConfigService, prisma as PrismaService);
  });

  it('records a failed invoice attempt with a safe fallback reference', async () => {
    const invoice = {
      id: 'in_failed_123',
      subscription: 'sub_stripe_123',
      payment_intent: null,
      amount_due: 2599,
      currency: 'gbp',
      last_finalization_error: { message: 'Payment method declined' },
    } as any;

    await (service as any).onInvoiceFailed(invoice);

    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        stripeIntentId: 'in_failed_123',
        stripeInvoiceId: 'in_failed_123',
        amount: 25.99,
        currency: 'GBP',
        status: 'failed',
        failureMessage: 'Payment method declined',
      }),
    });
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'PAST_DUE' } }),
    );
  });

  it('syncs a Stripe charge refund to the local payment status', async () => {
    await (service as any).onChargeRefunded({
      payment_intent: 'pi_test_123',
      amount_refunded: 1250,
      refunded: false,
    });

    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { stripeIntentId: 'pi_test_123' },
      data: { amountRefunded: 12.5, status: 'partially_refunded' },
    });
  });
});
