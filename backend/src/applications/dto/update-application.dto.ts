import { IsOptional, IsEnum, IsString, IsDateString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from './create-application.dto';

export class UpdateApplicationDto {
  @ApiPropertyOptional({ example: 'Senior Software Engineer', description: 'Job title' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  jobTitle?: string;

  @ApiPropertyOptional({ example: 'Acme Corp', description: 'Company name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional({ example: 'London, UK', description: 'Job location' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ enum: ApplicationStatus, description: 'Updated application status' })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({ example: 'Had first interview today', description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: '2024-03-15T00:00:00.000Z',
    description: 'Date the application was submitted',
  })
  @IsOptional()
  @IsDateString()
  appliedDate?: string;

  @ApiPropertyOptional({ example: 'resume-uuid', description: 'Linked resume ID' })
  @IsOptional()
  @IsString()
  resumeId?: string;

  @ApiPropertyOptional({ example: 'cover-letter-uuid', description: 'Linked cover letter ID' })
  @IsOptional()
  @IsString()
  coverLetterId?: string;
}
