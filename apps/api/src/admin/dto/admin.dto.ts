import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  MaxLength,
  Matches,
  IsUrl,
  ValidateNested,
  IsArray,
  IsISO8601,
  MinLength,
  IsBoolean,
  IsNumber,
  ArrayUnique,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class UpdateRolePermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  permissions!: string[];
}

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

class StripePriceInputDto {
  @IsString()
  @MaxLength(40)
  @Matches(/^[A-Z][A-Z0-9_]*$/)
  plan!: string;

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

export class CreatePlanDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  @Matches(/^[A-Z][A-Z0-9_]*$/)
  name!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceMonthly!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceYearly!: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsEnum(['GBP', 'INR'])
  currency!: 'GBP' | 'INR';

  @Type(() => Number)
  @IsInt()
  @Min(-1)
  @Max(1000000)
  aiCreditsMonthly!: number;
}

export class UpdatePlanDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceMonthly?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceYearly?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsEnum(['GBP', 'INR'])
  currency?: 'GBP' | 'INR';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-1)
  @Max(1000000)
  aiCreditsMonthly?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateDiscountCodeDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[A-Z0-9-]+$/)
  code!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  percentOff!: number;

  @IsEnum(['ONCE', 'REPEATING', 'FOREVER'])
  duration!: 'ONCE' | 'REPEATING' | 'FOREVER';

  @ApiPropertyOptional({ description: 'Required when duration is REPEATING.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationInMonths?: number;

  @ApiPropertyOptional({ description: 'UTC ISO 8601 timestamp after which new redemptions stop.' })
  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/Z$/)
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Global redemption limit across all customers.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxRedemptions?: number;
}

export class ListDiscountCodesDto {
  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  startingAfter?: string;
}

export class UpdateAIPlatformSettingsDto {
  @IsEnum(['GEMINI', 'OPENAI', 'ANTHROPIC', 'DEEPSEEK', 'GROQ', 'KIMI', 'NVIDIA', 'OLLAMA'])
  provider!: 'GEMINI' | 'OPENAI' | 'ANTHROPIC' | 'DEEPSEEK' | 'GROQ' | 'KIMI' | 'NVIDIA' | 'OLLAMA';

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

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  subject!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;

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

export class CreateRefundDto {
  @ApiPropertyOptional({
    description: 'Optional partial refund in the currency’s smallest unit (for example, pence).',
    minimum: 1,
    maximum: 100_000_000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  amount?: number;

  @ApiPropertyOptional({ enum: ['duplicate', 'fraudulent', 'requested_by_customer'] })
  @IsOptional()
  @IsEnum(['duplicate', 'fraudulent', 'requested_by_customer'])
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}

export class CreateSiteBannerDto {
  @ApiProperty({ maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string;

  @ApiProperty({ maxLength: 500 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message!: string;

  @ApiPropertyOptional({ maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  linkText?: string;

  @ApiPropertyOptional({ description: 'HTTPS URL or a same-site path beginning with /.' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Matches(/^(\/(?!\/)[^\s<>"']*|https:\/\/[^\s<>"']+)$/)
  linkUrl?: string;

  @ApiPropertyOptional({ enum: ['INFO', 'PROMO', 'WARNING'] })
  @IsOptional()
  @IsEnum(['INFO', 'PROMO', 'WARNING'])
  variant?: 'INFO' | 'PROMO' | 'WARNING';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'ISO 8601 timestamp when the banner becomes visible.' })
  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  startsAt?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 timestamp when the banner stops being visible.' })
  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  endsAt?: string;
}

export class UpdateSiteBannerDto extends PartialType(CreateSiteBannerDto) {}
