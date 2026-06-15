import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateResumeDto {
  @ApiPropertyOptional({ example: 'Senior Backend Engineer Resume 2026' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Set this resume as the default for autofill' })
  @IsOptional()
  isDefault?: boolean;
}
