import {
  IsString, IsOptional, IsEnum, MinLength, MaxLength, IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CoverLetterVariantDto {
  STANDARD       = 'STANDARD',
  CONCISE        = 'CONCISE',
  DETAILED       = 'DETAILED',
  HIRING_MANAGER = 'HIRING_MANAGER',
}

export class GenerateCoverLetterDto {
  @ApiProperty({ description: 'UUID of the source resume (used to pull achievements)', example: 'e1b2c3d4-...' })
  @IsUUID()
  resumeId: string;

  @ApiProperty({ example: 'Senior Software Engineer' })
  @IsString()
  @MaxLength(120)
  jobTitle: string;

  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @MaxLength(120)
  companyName: string;

  @ApiProperty({ description: 'Full job description text', minLength: 50 })
  @IsString()
  @MinLength(50)
  @MaxLength(8000)
  jobDescription: string;

  @ApiProperty({
    enum: CoverLetterVariantDto,
    description: 'STANDARD (350-400w) | CONCISE (≤250w) | DETAILED (500-600w) | HIRING_MANAGER (addressed by name)',
    default: 'STANDARD',
  })
  @IsEnum(CoverLetterVariantDto)
  variant: CoverLetterVariantDto = CoverLetterVariantDto.STANDARD;

  @ApiPropertyOptional({ description: 'Required when variant=HIRING_MANAGER', example: 'Sarah Chen' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  hiringManagerName?: string;
}
