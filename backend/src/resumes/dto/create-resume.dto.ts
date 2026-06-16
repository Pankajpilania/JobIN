import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateResumeDto {
  @ApiProperty({ example: 'Software Engineer Resume 2024', description: 'Title for this resume', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;
}
