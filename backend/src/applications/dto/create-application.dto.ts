import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ApplicationStatus {
  SAVED = 'SAVED',
  APPLIED = 'APPLIED',
  PHONE_SCREEN = 'PHONE_SCREEN',
  INTERVIEW = 'INTERVIEW',
  TECHNICAL_ASSESSMENT = 'TECHNICAL_ASSESSMENT',
  FINAL_ROUND = 'FINAL_ROUND',
  OFFER = 'OFFER',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export class CreateApplicationDto {
  @ApiProperty({ example: 'Senior Software Engineer', description: 'Job title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  jobTitle: string;

  @ApiProperty({ example: 'Acme Corp', description: 'Company name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  companyName: string;

  @ApiPropertyOptional({ example: 'London, UK', description: 'Job location' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({
    enum: ApplicationStatus,
    default: ApplicationStatus.SAVED,
    description: 'Current application status',
  })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({ example: 'Applied via LinkedIn', description: 'Notes about the application' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: 'job-listing-uuid',
    description: 'Optional linked job listing ID',
  })
  @IsOptional()
  @IsString()
  jobListingId?: string;

  @ApiPropertyOptional({ example: 'resume-uuid', description: 'Optional linked resume ID' })
  @IsOptional()
  @IsString()
  resumeId?: string;

  @ApiPropertyOptional({
    example: 'cover-letter-uuid',
    description: 'Optional linked cover letter ID',
  })
  @IsOptional()
  @IsString()
  coverLetterId?: string;
}
