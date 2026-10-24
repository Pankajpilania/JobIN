import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsNumber,
  MaxLength,
  Matches,
  IsBoolean,
  IsUrl,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// ─── List users ───────────────────────────────────────────────────────────────
export class ListUsersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'SUSPENDED', 'DELETED'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'SUSPENDED', 'DELETED'])
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;

  @ApiPropertyOptional({ enum: ['createdAt', 'email', 'fullName', 'lastLoginAt'] })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortDir?: 'asc' | 'desc' = 'desc';
}

// ─── Update user (admin) ──────────────────────────────────────────────────────
export class AdminUpdateUserDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'SUSPENDED', 'DELETED'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'SUSPENDED', 'DELETED'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional({ description: 'Complimentary plan duration in days; null means no expiry' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  planDurationDays?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  grantCredits?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateManualPaymentSettingsDto {
  @IsEnum(['INR', 'GBP'])
  currency!: 'INR' | 'GBP';

  @IsString()
  @MaxLength(80)
  methodLabel!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  paymentDetails?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^(https:\/\/[^\s]+|\/[^\s]*)?$/i, {
    message: 'QR URL must be an HTTPS URL or a root-relative path',
  })
  qrUrl?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000)
  premiumAmount!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000)
  proAmount!: number;
}

export class CreateManualPaymentMethodDto {
  @IsEnum(['INR', 'GBP'])
  currency!: 'INR' | 'GBP';

  @IsString()
  @MaxLength(80)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  paymentDetails?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^(https:\/\/[^\s]+|\/[^\s]*)?$/i)
  qrUrl?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateManualPaymentMethodDto {
  @IsOptional()
  @IsEnum(['INR', 'GBP'])
  currency?: 'INR' | 'GBP';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  paymentDetails?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^(https:\/\/[^\s]+|\/[^\s]*)?$/i)
  qrUrl?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

class StripePriceInputDto {
  @IsEnum(['PREMIUM', 'PRO'])
  plan!: 'PREMIUM' | 'PRO';

  @IsEnum(['INR', 'GBP'])
  currency!: 'INR' | 'GBP';

  @IsEnum(['MONTHLY', 'YEARLY'])
  interval!: 'MONTHLY' | 'YEARLY';

  @IsString()
  @MaxLength(100)
  @Matches(/^$|^price_[A-Za-z0-9]+$/)
  stripePriceId!: string;
}

export class UpdateStripePricesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StripePriceInputDto)
  prices!: StripePriceInputDto[];
}

export class UpdateAIPlatformSettingsDto {
  @IsEnum(['GEMINI', 'OPENAI', 'ANTHROPIC', 'DEEPSEEK', 'NVIDIA', 'OLLAMA'])
  provider!: 'GEMINI' | 'OPENAI' | 'ANTHROPIC' | 'DEEPSEEK' | 'NVIDIA' | 'OLLAMA';

  @IsString()
  @MaxLength(120)
  model!: string;

  @IsOptional()
  @IsUrl({ require_protocol: true, require_tld: false })
  @MaxLength(500)
  baseUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;
}

// ─── Send notification / email campaign ──────────────────────────────────────
export class SendNotificationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string; // single user; omit for broadcast

  @ApiPropertyOptional({ enum: ['ALL', 'ACTIVE', 'PREMIUM', 'CHURNED'] })
  @IsOptional()
  @IsEnum(['ALL', 'ACTIVE', 'PREMIUM', 'CHURNED'])
  audience?: string;

  @IsString() subject!: string;
  @IsString() content!: string;

  @ApiPropertyOptional({ enum: ['EMAIL', 'IN_APP'] })
  @IsOptional()
  @IsEnum(['EMAIL', 'IN_APP'])
  type?: string = 'EMAIL';
}

// ─── List subscriptions ───────────────────────────────────────────────────────
export class ListSubscriptionsDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'EXPIRED', 'CANCELLED', 'PAST_DUE'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'EXPIRED', 'CANCELLED', 'PAST_DUE'])
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;
}
