import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type SupabaseUserPayload } from '../common/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { JobSearchService, type JobSearchResponse } from './job-search.service';
import { BrowseJobListingsDto } from './dto/browse-job-listings.dto';
import { SearchJobsDto } from './dto/search-jobs.dto';

@ApiTags('Job Search')
@ApiBearerAuth('SupabaseJWT')
@UseGuards(SupabaseAuthGuard)
@Controller('job-search')
export class JobSearchController {
  constructor(private readonly jobSearchService: JobSearchService) {}

  @Get()
  @ApiOperation({ summary: 'Browse the synced job catalogue with filters and pagination' })
  browse(
    @CurrentUser() _user: SupabaseUserPayload,
    @Query() dto: BrowseJobListingsDto,
  ) {
    return this.jobSearchService.browseCatalogue(dto);
  }

  @Post()
  @ApiOperation({
    summary: 'Search public job feeds and optionally save matching results to the tracker',
  })
  search(
    @CurrentUser() user: SupabaseUserPayload,
    @Body() dto: SearchJobsDto,
  ): Promise<JobSearchResponse> {
    return this.jobSearchService.search(user.id, dto);
  }
}
