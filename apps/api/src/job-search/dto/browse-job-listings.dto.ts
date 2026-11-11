import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const JOB_SOURCES = ['Arbeitnow', 'Remote OK', 'Greenhouse', 'Lever', 'Ashby'] as const;
const POSTED_WITHIN = ['24h', '7d', '30d'] as const;
const SORT_OPTIONS = ['newest', 'relevance'] as const;

const transformBooleanStrings = ({ value }: { value: unknown }) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class BrowseJobListingsDto {
  @ApiPropertyOptional({ example: 'product designer' })
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

  @ApiPropertyOptional({
    default: false,
    description: 'Include only listings whose text indicates visa sponsorship is offered.',
  })
  @IsOptional()
  @Transform(transformBooleanStrings)
  @IsBoolean()
  visaSponsorshipOnly = false;

  @ApiPropertyOptional({ enum: JOB_SOURCES })
  @IsOptional()
  @IsIn(JOB_SOURCES)
  source?: (typeof JOB_SOURCES)[number];

  @ApiPropertyOptional({ enum: POSTED_WITHIN, description: 'Limit by listing publication age.' })
  @IsOptional()
  @IsIn(POSTED_WITHIN)
  postedWithin?: (typeof POSTED_WITHIN)[number];

  @ApiPropertyOptional({ enum: SORT_OPTIONS, default: 'newest' })
  @IsOptional()
  @IsIn(SORT_OPTIONS)
  sort: (typeof SORT_OPTIONS)[number] = 'newest';

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 25, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;
}
