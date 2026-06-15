import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards,
  UseInterceptors, UploadedFile, HttpCode, HttpStatus, ParseUUIDPipe, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody, ApiParam,
} from '@nestjs/swagger';
import { ResumesService } from './resumes.service';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { TailorResumeDto } from './dto/tailor-resume.dto';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser, type SupabaseUserPayload } from '../common/decorators/current-user.decorator';
import type { Express } from 'express';

@ApiTags('Resumes')
@ApiBearerAuth('SupabaseJWT')
@UseGuards(SupabaseAuthGuard)
@Controller('resumes')
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  // ─── Upload ───────────────────────────────────────────────────────────────

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: memoryStorage(),
      limits:  { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        cb(allowed.includes(file.mimetype) ? null : new Error('Unsupported type'), allowed.includes(file.mimetype));
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['resume'], properties: { resume: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Upload a resume (PDF or DOCX)' })
  upload(@CurrentUser() user: SupabaseUserPayload, @UploadedFile() file: Express.Multer.File) {
    return this.resumesService.upload(user.id, file);
  }

  // ─── List / Get / Update / Delete ─────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all resumes' })
  findAll(@CurrentUser() user: SupabaseUserPayload) {
    return this.resumesService.findAll(user.id);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Resume UUID' })
  @ApiOperation({ summary: 'Get a single resume with pre-signed download URL' })
  findOne(@CurrentUser() user: SupabaseUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.resumesService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', description: 'Resume UUID' })
  @ApiOperation({ summary: 'Update resume title or set as default' })
  update(@CurrentUser() user: SupabaseUserPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateResumeDto) {
    return this.resumesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', description: 'Resume UUID' })
  @ApiOperation({ summary: 'Delete a resume' })
  delete(@CurrentUser() user: SupabaseUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.resumesService.delete(user.id, id);
  }

  // ─── ATS Analysis ─────────────────────────────────────────────────────────

  @Post(':id/analyse')
  @ApiParam({ name: 'id', description: 'Resume UUID' })
  @ApiOperation({ summary: 'Run Gemini ATS analysis' })
  analyse(@CurrentUser() user: SupabaseUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.resumesService.analyse(user.id, id);
  }

  // ─── Tailor (Sprint 3) ────────────────────────────────────────────────────

  @Post(':id/tailor')
  @ApiParam({ name: 'id', description: 'Resume UUID' })
  @ApiOperation({
    summary: 'Tailor resume for a job using Gemini XYZ formula',
    description: 'Rewrites bullet points using the XYZ achievement formula, embeds job keywords, and returns before/after ATS score with a list of changes applied. Saves a new resume_version record.',
  })
  tailor(
    @CurrentUser() user: SupabaseUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TailorResumeDto,
  ) {
    return this.resumesService.tailor(user.id, id, dto);
  }

  // ─── Versions (Sprint 3) ──────────────────────────────────────────────────

  @Get(':id/versions')
  @ApiParam({ name: 'id', description: 'Resume UUID' })
  @ApiOperation({ summary: 'List all tailored versions of a resume' })
  getVersions(@CurrentUser() user: SupabaseUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.resumesService.getVersions(user.id, id);
  }

  // ─── Export PDF (Sprint 3) ─────────────────────────────────────────────────

  @Get(':id/export/pdf')
  @ApiParam({ name: 'id', description: 'Resume UUID' })
  @ApiOperation({ summary: 'Export resume (or latest tailored version) as PDF' })
  async exportPdf(
    @CurrentUser() user: SupabaseUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.resumesService.exportPdf(user.id, id);
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      String(buffer.length),
    });
    res.send(buffer);
  }

  // ─── Export DOCX (Sprint 3) ────────────────────────────────────────────────

  @Get(':id/export/docx')
  @ApiParam({ name: 'id', description: 'Resume UUID' })
  @ApiOperation({ summary: 'Export resume (or latest tailored version) as DOCX' })
  async exportDocx(
    @CurrentUser() user: SupabaseUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.resumesService.exportDocx(user.id, id);
    res.set({
      'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      String(buffer.length),
    });
    res.send(buffer);
  }
}
