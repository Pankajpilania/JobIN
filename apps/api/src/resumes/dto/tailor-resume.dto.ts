import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TailorResumeDto {
  @ApiProperty({
    description: 'The full job description text to tailor the resume against',
    example: 'We are looking for a Senior Software Engineer with 5+ years of experience in TypeScript...',
    minLength: 50,
  })
  @IsString()
  @MinLength(50, { message: 'Job description must be at least 50 characters' })
  @MaxLength(8000)
  jobDescription: string;

  @ApiPropertyOptional({ example: 'Senior Software Engineer' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;

  @ApiPropertyOptional({ example: 'Acme Corp' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyName?: string;
}
