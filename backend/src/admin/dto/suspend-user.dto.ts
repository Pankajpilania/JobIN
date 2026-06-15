import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuspendUserDto {
  @ApiProperty({ example: 'Violation of terms of service', description: 'Reason for suspension' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ example: 30, description: 'Duration of suspension in days (optional)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  durationDays?: number;
}
