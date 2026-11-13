import { IsEnum, IsString, Matches, MaxLength } from 'class-validator';
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

  @ApiProperty({ description: 'Plan code managed by administrators', default: 'PREMIUM' })
  @IsString()
  @MaxLength(40)
  @Matches(/^[A-Z][A-Z0-9_]*$/)
  plan: string = 'PREMIUM';

  @ApiProperty({ enum: ['GBP', 'INR'], default: 'GBP' })
  @IsEnum(['GBP', 'INR'])
  currency: 'GBP' | 'INR' = 'GBP';
}
