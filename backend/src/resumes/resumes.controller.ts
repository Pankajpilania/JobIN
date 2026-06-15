import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { ResumesService } from './resumes.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Resumes')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('resumes')
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'title'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'PDF or DOCX file (max 10MB)' },
        title: { type: 'string', description: 'Resume title' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a resume (PDF or DOCX, max 10MB)' })
  @ApiResponse({ status: 201, description: 'Resume uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  async upload(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateResumeDto,
  ) {
    return this.resumesService.upload(user.id, file, dto.title);
  }

  @Get()
  @ApiOperation({ summary: 'List all resumes for the current user' })
  @ApiResponse({ status: 200, description: 'List of resumes' })
  async findAll(@CurrentUser() user: any) {
    return this.resumesService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single resume by ID' })
  @ApiResponse({ status: 200, description: 'Resume details with signed download URL' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async findOne(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.resumesService.findOne(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a resume (removes from S3 and DB)' })
  @ApiResponse({ status: 200, description: 'Resume deleted' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async delete(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.resumesService.delete(user.id, id);
  }

  @Patch(':id/set-default')
  @ApiOperation({ summary: 'Set a resume as the default resume' })
  @ApiResponse({ status: 200, description: 'Default resume updated' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async setDefault(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.resumesService.setDefault(user.id, id);
  }
}
