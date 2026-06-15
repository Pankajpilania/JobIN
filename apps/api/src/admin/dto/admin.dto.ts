import { IsEnum, IsOptional, IsString, IsInt, Min, Max, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// ─── List users ───────────────────────────────────────────────────────────────
export class ListUsersDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'SUSPENDED', 'DELETED'] })
  @IsOptional() @IsEnum(['ACTIVE', 'SUSPENDED', 'DELETED'])
  status?: string;

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 25;

  @ApiPropertyOptional({ enum: ['createdAt', 'email', 'fullName', 'lastLoginAt'] })
  @IsOptional() @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] }) @IsOptional() @IsString()
  sortDir?: 'asc' | 'desc' = 'desc';
}

// ─── Update user (admin) ──────────────────────────────────────────────────────
export class AdminUpdateUserDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'SUSPENDED', 'DELETED'] })
  @IsOptional() @IsEnum(['ACTIVE', 'SUSPENDED', 'DELETED'])
  status?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  planId?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0)
  @Type(() => Number)
  grantCredits?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  role?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  note?: string;
}

// ─── Send notification / email campaign ──────────────────────────────────────
export class SendNotificationDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  userId?: string;          // single user; omit for broadcast

  @ApiPropertyOptional({ enum: ['ALL', 'ACTIVE', 'PREMIUM', 'CHURNED'] })
  @IsOptional() @IsEnum(['ALL', 'ACTIVE', 'PREMIUM', 'CHURNED'])
  audience?: string;

  @IsString() subject!: string;
  @IsString() content!: string;

  @ApiPropertyOptional({ enum: ['EMAIL', 'IN_APP'] })
  @IsOptional() @IsEnum(['EMAIL', 'IN_APP'])
  type?: string = 'EMAIL';
}

// ─── List subscriptions ───────────────────────────────────────────────────────
export class ListSubscriptionsDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'EXPIRED', 'CANCELLED', 'PAST_DUE'] })
  @IsOptional() @IsEnum(['ACTIVE', 'EXPIRED', 'CANCELLED', 'PAST_DUE'])
  status?: string;

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 25;
}
