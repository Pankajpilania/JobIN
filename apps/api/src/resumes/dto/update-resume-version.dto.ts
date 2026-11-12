import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateResumeVersionDto {
  @ApiProperty({ description: 'Manually edited tailored resume text', maxLength: 40000 })
  @IsString()
  @MinLength(50)
  @MaxLength(40000)
  tailoredContent: string;
}
