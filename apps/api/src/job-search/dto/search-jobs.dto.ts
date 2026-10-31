import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const transformBooleanStrings = ({ value }: { value: unknown }) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class SearchJobsDto {
  @ApiPropertyOptional({ example: 'software engineer' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  query?: string;

  @ApiPropertyOptional({ example: 'London, UK' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(transformBooleanStrings)
  @IsBoolean()
  remoteOnly = false;

  @ApiPropertyOptional({ default: 25, maximum: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25)
  limit = 25;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(transformBooleanStrings)
  @IsBoolean()
  autoImport = true;
}
