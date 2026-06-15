import {
  Controller, Get, Post, Delete, Param, Body, UseGuards,
  HttpCode, HttpStatus, ParseUUIDPipe, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CoverLettersService } from './cover-letters.service';
import { GenerateCoverLetterDto } from './dto/generate-cover-letter.dto';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser, type SupabaseUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Cover Letters')
@ApiBearerAuth('SupabaseJWT')
@UseGuards(SupabaseAuthGuard)
@Controller('cover-letters')
export class CoverLettersController {
  constructor(private readonly coverLettersService: CoverLettersService) {}

  // ─── POST /api/cover-letters/generate ────────────────────────────────────

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate a personalised cover letter using Gemini',
    description:
      'Accepts a resume ID, job description, and variant. ' +
      'Variants: STANDARD (350-400w), CONCISE (≤250w), DETAILED (500-600w), HIRING_MANAGER (addressed by name). ' +
      'Saves and returns the generated cover letter.',
  })
  generate(@CurrentUser() user: SupabaseUserPayload, @Body() dto: GenerateCoverLetterDto) {
    return this.coverLettersService.generate(user.id, dto);
  }

  // ─── GET /api/cover-letters ───────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all cover letters for the authenticated user' })
  findAll(@CurrentUser() user: SupabaseUserPayload) {
    return this.coverLettersService.findAll(user.id);
  }

  // ─── GET /api/cover-letters/:id ───────────────────────────────────────────

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Cover letter UUID' })
  @ApiOperation({ summary: 'Get a single cover letter with full content' })
  findOne(@CurrentUser() user: SupabaseUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.coverLettersService.findOne(user.id, id);
  }

  // ─── DELETE /api/cover-letters/:id ────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', description: 'Cover letter UUID' })
  @ApiOperation({ summary: 'Delete a cover letter' })
  delete(@CurrentUser() user: SupabaseUserPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.coverLettersService.delete(user.id, id);
  }

  // ─── GET /api/cover-letters/:id/export/pdf ────────────────────────────────

  @Get(':id/export/pdf')
  @ApiParam({ name: 'id', description: 'Cover letter UUID' })
  @ApiOperation({ summary: 'Export cover letter as PDF' })
  async exportPdf(
    @CurrentUser() user: SupabaseUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.coverLettersService.exportPdf(user.id, id);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': String(buffer.length) });
    res.send(buffer);
  }

  // ─── GET /api/cover-letters/:id/export/docx ───────────────────────────────

  @Get(':id/export/docx')
  @ApiParam({ name: 'id', description: 'Cover letter UUID' })
  @ApiOperation({ summary: 'Export cover letter as DOCX' })
  async exportDocx(
    @CurrentUser() user: SupabaseUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.coverLettersService.exportDocx(user.id, id);
    res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': String(buffer.length) });
    res.send(buffer);
  }
}
