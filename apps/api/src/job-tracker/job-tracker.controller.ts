import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JobTrackerService } from './job-tracker.service';
import { CreateApplicationDto, ApplicationStatusDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser, type SupabaseUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Job Tracker')
@ApiBearerAuth('SupabaseJWT')
@UseGuards(SupabaseAuthGuard)
@Controller('applications')
export class JobTrackerController {
  constructor(private readonly jobTrackerService: JobTrackerService) {}

  // ─── GET /api/applications/stats ──────────────────────────────────────────
  @Get('stats')
  @ApiOperation({ summary: 'Get aggregated application statistics for the dashboard' })
  getStats(@CurrentUser() user: SupabaseUserPayload) {
    return this.jobTrackerService.getStats(user.id);
  }

  // ─── GET /api/applications/activity ────────────────────────────────────────
  @Get('activity')
  @ApiOperation({ summary: 'Get recent activity feed (last 8 application updates)' })
  getActivity(@CurrentUser() user: SupabaseUserPayload) {
    return this.jobTrackerService.getRecentActivity(user.id);
  }

  // ─── POST /api/applications ────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new job application record' })
  create(@CurrentUser() user: SupabaseUserPayload, @Body() dto: CreateApplicationDto) {
    return this.jobTrackerService.create(user.id, dto);
  }

  // ─── GET /api/applications ─────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'List all applications, optionally filtered by status' })
  @ApiQuery({ name: 'status', required: false, enum: ApplicationStatusDto })
  findAll(
    @CurrentUser() user: SupabaseUserPayload,
    @Query('status') status?: ApplicationStatusDto,
  ) {
    return this.jobTrackerService.findAll(user.id, status);
  }

  // ─── GET /api/applications/:id ─────────────────────────────────────────────
  @Get(':id')
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiOperation({ summary: 'Get a single application' })
  findOne(@CurrentUser() user: SupabaseUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.jobTrackerService.findOne(user.id, id);
  }

  // ─── PATCH /api/applications/:id ───────────────────────────────────────────
  @Patch(':id')
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiOperation({ summary: 'Update application status, notes, dates, or any field' })
  update(
    @CurrentUser() user: SupabaseUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.jobTrackerService.update(user.id, id, dto);
  }

  // ─── DELETE /api/applications/:id ──────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', description: 'Application UUID' })
  @ApiOperation({ summary: 'Delete an application record' })
  delete(@CurrentUser() user: SupabaseUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.jobTrackerService.delete(user.id, id);
  }
}
