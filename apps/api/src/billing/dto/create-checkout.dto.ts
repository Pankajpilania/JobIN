import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BillingInterval {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export class CreateCheckoutDto {
  @ApiProperty({
    enum: BillingInterval,
    description: 'Billing interval: MONTHLY or YEARLY',
    default: 'MONTHLY',
  })
  @IsEnum(BillingInterval)
  interval: BillingInterval;

  @ApiProperty({ enum: ['PREMIUM', 'PRO'], default: 'PREMIUM' })
  @IsEnum(['PREMIUM', 'PRO'])
  plan: 'PREMIUM' | 'PRO' = 'PREMIUM';

  @ApiProperty({ enum: ['GBP', 'INR'], default: 'GBP' })
  @IsEnum(['GBP', 'INR'])
  currency: 'GBP' | 'INR' = 'GBP';
}
