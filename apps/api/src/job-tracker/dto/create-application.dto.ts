import {
  IsString, IsOptional, IsEnum, IsUrl, IsDateString, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ApplicationStatusDto {
  SAVED                = 'SAVED',
  APPLIED              = 'APPLIED',
  PHONE_SCREEN         = 'PHONE_SCREEN',
  INTERVIEW            = 'INTERVIEW',
  TECHNICAL_ASSESSMENT = 'TECHNICAL_ASSESSMENT',
  FINAL_ROUND          = 'FINAL_ROUND',
  OFFER                = 'OFFER',
  REJECTED             = 'REJECTED',
  WITHDRAWN            = 'WITHDRAWN',
}

export class CreateApplicationDto {
  @ApiProperty({ example: 'Senior Software Engineer' })
  @IsString()
  @MaxLength(200)
  jobTitle: string;

  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @MaxLength(200)
  companyName: string;

  @ApiPropertyOptional({ example: 'London, UK' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/jobs/...' })
  @IsOptional()
  @IsString()
  jobUrl?: string;

  @ApiPropertyOptional({ example: '£80,000 - £100,000' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  salary?: string;

  @ApiPropertyOptional({ enum: ApplicationStatusDto, default: 'SAVED' })
  @IsOptional()
  @IsEnum(ApplicationStatusDto)
  status?: ApplicationStatusDto;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  appliedDate?: string;

  @ApiPropertyOptional({ example: '2026-06-08T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @ApiPropertyOptional({ example: 'Applied via LinkedIn Easy Apply. Spoke to recruiter.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'LinkedIn' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resumeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverLetterId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobDescription?: string;
}
