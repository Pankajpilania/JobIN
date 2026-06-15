import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Applications')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new job application tracker card' })
  @ApiResponse({ status: 201, description: 'Application created successfully' })
  async create(@CurrentUser() user: any, @Body() dto: CreateApplicationDto) {
    return this.applicationsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all job applications for current user' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'SAVED', 'APPLIED', 'PHONE_SCREEN', 'INTERVIEW',
      'TECHNICAL_ASSESSMENT', 'FINAL_ROUND', 'OFFER', 'REJECTED', 'WITHDRAWN',
    ],
    description: 'Filter by application status',
  })
  @ApiResponse({ status: 200, description: 'List of applications' })
  async findAll(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.applicationsService.findAll(user.id, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific application by ID' })
  @ApiResponse({ status: 200, description: 'Application details' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async findOne(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.applicationsService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update application status, notes or appliedDate' })
  @ApiResponse({ status: 200, description: 'Application updated' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async update(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.applicationsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a job application tracker card' })
  @ApiResponse({ status: 200, description: 'Application deleted' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async delete(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.applicationsService.delete(user.id, id);
  }
}
