import { BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { AdminService } from './admin.service';

describe('AdminService discount codes', () => {
  let service: AdminService;
  let stripe: any;

  beforeEach(() => {
    service = Object.create(AdminService.prototype) as AdminService;
    (service as any).logger = { error: jest.fn() };
    (service as any).audit = jest.fn().mockResolvedValue(undefined);
    stripe = {
      coupons: {
        create: jest.fn().mockResolvedValue({ id: 'coupon_1' }),
        del: jest.fn().mockResolvedValue({ id: 'coupon_1', deleted: true }),
      },
      promotionCodes: {
        create: jest.fn().mockResolvedValue({
          id: 'promo_1', code: 'SAVE25', coupon: {
            id: 'coupon_1', percent_off: 25, duration: 'once', duration_in_months: null,
            valid: true,
          },
          active: true, expires_at: null, max_redemptions: 10, times_redeemed: 0,
          created: 1_800_000_000,
        }),
        retrieve: jest.fn(),
        update: jest.fn(),
        list: jest.fn(),
      },
    };
    jest.spyOn(service as any, 'discountStripeClient').mockReturnValue(stripe);
  });

  it('creates a global code with a capped redemption count and returns its summary', async () => {
    const result = await service.createDiscountCode('admin_1', {
      code: ' save25 ', percentOff: 25, duration: 'ONCE', maxRedemptions: 10,
    });

    expect(stripe.coupons.create).toHaveBeenCalledWith(expect.objectContaining({
      percent_off: 25, duration: 'once',
    }));
    expect(stripe.promotionCodes.create).toHaveBeenCalledWith(expect.objectContaining({
      coupon: 'coupon_1', code: 'SAVE25', max_redemptions: 10,
    }));
    expect(stripe.promotionCodes.create.mock.calls[0][0]).not.toHaveProperty('customer');
    expect(result).toMatchObject({ code: 'SAVE25', percentOff: 25, status: 'active' });
    expect((service as any).audit).toHaveBeenCalledWith(
      'admin_1', 'ADMIN_CREATE_DISCOUNT_CODE', 'StripePromotionCode', 'promo_1',
      undefined, expect.any(Object), { couponId: 'coupon_1' }, undefined,
    );
  });

  it('rejects past expiry and invalid repeating durations before calling Stripe', async () => {
    await expect(service.createDiscountCode('admin', {
      code: 'OLD', percentOff: 20, duration: 'ONCE', expiresAt: '2020-01-01T00:00:00Z',
    })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createDiscountCode('admin', {
      code: 'SHORT', percentOff: 20, duration: 'REPEATING',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(stripe.coupons.create).not.toHaveBeenCalled();
  });

  it('removes the coupon if Stripe cannot create the public code', async () => {
    stripe.promotionCodes.create.mockRejectedValue(new Stripe.errors.StripeInvalidRequestError({
      message: 'duplicate', type: 'invalid_request_error', code: 'promotion_code_exists',
    }));
    await expect(service.createDiscountCode('admin', {
      code: 'DUPLICATE', percentOff: 20, duration: 'ONCE',
    })).rejects.toThrow('already active');
    expect(stripe.coupons.del).toHaveBeenCalledWith('coupon_1');
  });

  it('deactivates the Stripe code and records the state change', async () => {
    const promotion = {
      id: 'promo_1', code: 'SAVE25', coupon: {
        id: 'coupon_1', percent_off: 25, duration: 'once', duration_in_months: null,
        valid: true,
      },
      active: true, expires_at: null, max_redemptions: null, times_redeemed: 0, created: 1_800_000_000,
    };
    stripe.promotionCodes.retrieve.mockResolvedValue(promotion);
    stripe.promotionCodes.update.mockResolvedValue({ ...promotion, active: false });

    await expect(service.deactivateDiscountCode('admin', 'promo_1')).resolves.toMatchObject({
      code: 'SAVE25', active: false, status: 'inactive',
    });
    expect(stripe.promotionCodes.update).toHaveBeenCalledWith(
      'promo_1', { active: false, expand: ['coupon'] },
    );
    expect((service as any).audit).toHaveBeenCalledWith(
      'admin', 'ADMIN_DEACTIVATE_DISCOUNT_CODE', 'StripePromotionCode', 'promo_1',
      expect.any(Object), expect.any(Object), undefined, undefined,
    );
  });
});
