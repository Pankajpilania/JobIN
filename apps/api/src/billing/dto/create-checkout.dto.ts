import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BillingInterval {
  MONTHLY = 'MONTHLY',
  YEARLY  = 'YEARLY',
}

export class CreateCheckoutDto {
  @ApiProperty({
    enum: BillingInterval,
    description: 'Billing interval: MONTHLY or YEARLY',
    default: 'MONTHLY',
  })
  @IsEnum(BillingInterval)
  interval: BillingInterval;

  @ApiProperty({
    description: 'Full URL to redirect after successful payment (e.g. http://localhost:3000/dashboard?upgraded=true)',
    required: false,
  })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiProperty({
    description: 'Full URL to redirect after payment cancellation',
    required: false,
  })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}
