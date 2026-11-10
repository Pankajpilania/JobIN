import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateDiscountCodeDto } from './admin.dto';

describe('CreateDiscountCodeDto', () => {
  it('normalizes codes and accepts supported limits and durations', async () => {
    const dto = plainToInstance(CreateDiscountCodeDto, {
      code: '  spring-2026 ',
      percentOff: '100',
      duration: 'REPEATING',
      durationInMonths: '3',
      expiresAt: '2026-12-31T23:59:59Z',
      maxRedemptions: '50',
    });

    expect(dto.code).toBe('SPRING-2026');
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([
    { code: 'ab', percentOff: 20, duration: 'ONCE' },
    { code: 'save now', percentOff: 20, duration: 'ONCE' },
    { code: 'SAVE20', percentOff: 0, duration: 'ONCE' },
    { code: 'SAVE20', percentOff: 101, duration: 'ONCE' },
    { code: 'SAVE20', percentOff: 20, duration: 'REPEATING', durationInMonths: 0 },
    { code: 'SAVE20', percentOff: 20, duration: 'ONCE', expiresAt: '2026-12-31T23:59:59+00:00' },
  ])('rejects invalid discount details %#', async (details) => {
    const dto = plainToInstance(CreateDiscountCodeDto, details);
    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
