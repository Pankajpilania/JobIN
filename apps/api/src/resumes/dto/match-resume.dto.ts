import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MatchResumeDto {
  @ApiProperty({ description: 'Plain text job description to compare with the owned resume.' })
  @IsString()
  @MinLength(20)
  @MaxLength(12000)
  jobDescription: string;
}
