import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import pdfParse from 'pdf-parse';
import PDFDocument from 'pdfkit';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  TabStopType,
  convertInchesToTwip,
} from 'docx';

export interface ExportOptions {
  title: string;
  subtitle?: string;
  content: string;
  author?: string;
  atsFriendly?: boolean;
  template?: string;
  pageSize?: string;
}

const execFileAsync = promisify(execFile);
type PaperSize = 'A4' | 'LETTER';
interface ResumeLayout {
  accent: string;
  rule: string;
  pageSize: PaperSize;
  marginInches: number;
  fontSize: number;
  fontFamily: 'sans' | 'serif';
}

function getResumeLayout(options: Pick<ExportOptions, 'template' | 'pageSize'>): ResumeLayout {
  const pageSize: PaperSize = options.pageSize?.toUpperCase() === 'LETTER' ? 'LETTER' : 'A4';
  const templates: Record<string, Omit<ResumeLayout, 'pageSize'>> = {
    modern: {
      accent: '087F8C',
      rule: 'CFD9E2',
      marginInches: 0.65,
      fontSize: 10,
      fontFamily: 'sans',
    },
    minimal: {
      accent: '263238',
      rule: 'D7D7D7',
      marginInches: 0.72,
      fontSize: 10,
      fontFamily: 'serif',
    },
    technical: {
      accent: '245B8F',
      rule: 'C8D5E2',
      marginInches: 0.62,
      fontSize: 9.8,
      fontFamily: 'sans',
    },
    executive: {
      accent: '705329',
      rule: 'D9CFBD',
      marginInches: 0.72,
      fontSize: 10.2,
      fontFamily: 'serif',
    },
    graduate: {
      accent: '4F5D95',
      rule: 'D2D7E8',
      marginInches: 0.68,
      fontSize: 10,
      fontFamily: 'sans',
    },
  };
  const selected = templates[options.template ?? 'modern'] ?? templates.modern;
  return { ...selected, pageSize };
}

const SECTION_HEADINGS = new Set([
  'summary',
  'professional summary',
  'profile',
  'professional profile',
  'objective',
  'experience',
  'work experience',
  'professional experience',
  'employment history',
  'education',
  'skills',
  'technical skills',
  'core skills',
  'certifications',
  'licenses',
  'projects',
  'personal projects',
  'achievements',
  'awards',
  'publications',
  'volunteer experience',
  'languages',
  'interests',
  'references',
  'additional information',
  'additional skills',
  'areas of expertise',
  'career summary',
  'core competencies',
  'key achievements',
  'selected projects',
  'soft skills',
  'technical proficiencies',
]);

function cleanResumeLine(line: string): string {
  return line
    .trim()
    .replace(/^#{1,6}\s+/, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi, '$1 $2')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[\u00a0\u200b]/g, ' ')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"');
}

function getResumeLines(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map(cleanResumeLine)
    .filter((line) => line.length > 0 && !/^[•‣▪*-]$/.test(line));
}

function isSectionHeading(line: string): boolean {
  const text = line.replace(/:$/, '').trim();
  const lower = text.toLowerCase();
  return SECTION_HEADINGS.has(lower) || (line.endsWith(':') && text.length > 2 && text.length < 60);
}

function isBullet(line: string): boolean {
  return /^\s*[-*•‣▪]\s+/.test(line);
}

function bulletText(line: string): string {
  return line.replace(/^\s*[-*•‣▪]\s+/, '');
}

function isLikelyName(line: string): boolean {
  return (
    line.length > 0 &&
    line.length <= 72 &&
    !isSectionHeading(line) &&
    !isBullet(line) &&
    !/[.!?]$/.test(line) &&
    /^[\p{L}\p{M}0-9 ,.'&()-]+$/u.test(line)
  );
}

function isLikelyContact(line: string): boolean {
  return (
    line.length <= 160 && /@|https?:\/\/|linkedin\.com|github\.com|\+?\d[\d\s().-]{7,}/i.test(line)
  );
}

function splitResumePair(line: string): [string, string] | null {
  const match = line.match(/^(.{1,100}?)\s+\|\s+(.{1,100})$/);
  return match ? [match[1].trim(), match[2].trim()] : null;
}

function splitLabeledLine(line: string): [string, string] | null {
  const match = line.match(/^([^:]{2,32}):\s*(.+)$/);
  return match ? [match[1].trim(), match[2].trim()] : null;
}

function latexEscape(value: string): string {
  const escaped: Record<string, string> = {
    '\\': '\\textbackslash{}',
    '{': '\\{',
    '}': '\\}',
    $: '\\$',
    '&': '\\&',
    '#': '\\#',
    '%': '\\%',
    _: '\\_',
    '~': '\\textasciitilde{}',
    '^': '\\textasciicircum{}',
  };
  return value.replace(/[\\{}$&#%_~^]/g, (character) => escaped[character]);
}

interface ResumeTextPart {
  text: string;
  href?: string;
}

interface PdfTextWriter {
  text(text: string, options?: Record<string, unknown>): unknown;
  link(x: number, y: number, width: number, height: number, url: string): unknown;
  widthOfString(text: string, options?: Record<string, unknown>): number;
  currentLineHeight(includeGap?: boolean): number;
  x: number;
  y: number;
  page: { width: number; margins: { left: number; right: number } };
}

function splitLinkedText(text: string): ResumeTextPart[] {
  const matches: Array<{ start: number; end: number; href: string }> = [];
  const linkPattern =
    /(?:https?:\/\/|www\.)[^\s<>()]+|(?:linkedin|github)\.com\/[^\s<>()]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

  for (const match of text.matchAll(linkPattern)) {
    const value = match[0];
    const start = match.index ?? 0;
    const trailingPunctuation = value.match(/[.,;:!?]+$/)?.[0].length ?? 0;
    const visible = value.slice(0, value.length - trailingPunctuation);
    if (!visible) continue;
    const href = visible.includes('@')
      ? `mailto:${visible}`
      : /^https?:\/\//i.test(visible)
        ? visible
        : `https://${visible}`;
    matches.push({ start, end: start + visible.length, href });
  }

  if (isLikelyContact(text)) {
    const phonePattern = /(?<![\w])\+?\d[\d\s().-]{6,}\d(?![\w])/g;
    for (const match of text.matchAll(phonePattern)) {
      const value = match[0];
      if (value.replace(/\D/g, '').length < 8) continue;
      const start = match.index ?? 0;
      matches.push({
        start,
        end: start + value.length,
        href: `tel:${value.replace(/[^\d+]/g, '')}`,
      });
    }
  }

  matches.sort((left, right) => left.start - right.start);
  const parts: ResumeTextPart[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start < cursor) continue;
    if (match.start > cursor) parts.push({ text: text.slice(cursor, match.start) });
    parts.push({ text: text.slice(match.start, match.end), href: match.href });
    cursor = match.end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts.length ? parts : [{ text }];
}

function writePdfText(
  doc: PdfTextWriter,
  text: string,
  options: Record<string, unknown> = {},
): void {
  const parts = splitLinkedText(text);
  const textWidth = doc.widthOfString(text, options);
  const indent = typeof options.indent === 'number' ? options.indent : 0;
  const maxWidth =
    typeof options.width === 'number'
      ? options.width
      : doc.page.width - doc.page.margins.left - doc.page.margins.right - indent;
  const y = typeof options.y === 'number' ? options.y : doc.y;
  const align = options.align;
  const x =
    typeof options.x === 'number'
      ? options.x
      : align === 'center'
        ? doc.page.margins.left + (maxWidth - textWidth) / 2
        : doc.page.margins.left + indent;

  // Draw a line as one text run. Splitting it into continued runs causes PDFKit
  // to reset wrapping/alignment around email and phone links in contact headers.
  doc.text(text, options);

  // Keep the printable resume text as one normal text run for ATS parsing, then
  // add clickable annotations only when the entire line fits on one line.
  if (textWidth > maxWidth) return;
  const height = doc.currentLineHeight();
  let offset = 0;
  for (const part of parts) {
    if (part.href) {
      doc.link(
        x + doc.widthOfString(text.slice(0, offset)),
        y,
        doc.widthOfString(part.text),
        height,
        part.href,
      );
    }
    offset += part.text.length;
  }
}

function latexText(value: string): string {
  return splitLinkedText(value)
    .map((part) => {
      const label = latexEscape(part.text);
      if (!part.href) return label;
      const safeHref = encodeURI(part.href).replace(/%(?![0-9a-f]{2})/gi, '%25');
      return `\\href{${safeHref}}{${label}}`;
    })
    .join('');
}

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  /** Compile the same ATS LaTeX source users can download; use PDFKit if Tectonic is absent. */
  async generateCompiledPdf(options: ExportOptions): Promise<{ buffer: Buffer; engine: string }> {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'jobin-resume-tex-'));
    const texPath = path.join(tempDir, 'resume.tex');
    const pdfPath = path.join(tempDir, 'resume.pdf');

    try {
      await writeFile(texPath, this.generateLatex(options), { encoding: 'utf8', mode: 0o600 });
      await execFileAsync(
        process.env.LATEX_COMPILER || 'tectonic',
        ['--untrusted', '--outdir', tempDir, texPath],
        {
          cwd: tempDir,
          timeout: 60_000,
          maxBuffer: 2 * 1024 * 1024,
          windowsHide: true,
          env: { ...process.env, TECTONIC_UNTRUSTED_MODE: '1' },
        },
      );

      const buffer = await readFile(pdfPath);
      if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
        throw new Error('The LaTeX compiler did not produce a valid PDF.');
      }
      const parsed = await pdfParse(buffer);
      if (!parsed.numpages || !parsed.text.trim()) {
        throw new Error('The compiled PDF failed text and page validation.');
      }
      return { buffer, engine: 'tectonic' };
    } catch (error) {
      const errorCode = (error as NodeJS.ErrnoException).code;
      const fallbackReason = errorCode === 'ENOENT' ? 'compiler unavailable' : 'compilation failed';
      this.logger.warn(`LaTeX PDF generation fallback: ${fallbackReason}`);
      return { buffer: await this.generatePdf(options), engine: 'pdfkit-fallback' };
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  // ATS resume PDF: one column, standard font, selectable text and familiar headings.
  async generatePdf(options: ExportOptions): Promise<Buffer> {
    if (options.atsFriendly) return this.generateAtsPdf(options);

    const { title, subtitle, content, author } = options;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 72,
        size: 'A4',
        info: { Title: title, Author: author ?? 'JobIN' },
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fillColor('#1e40af').font('Helvetica-Bold').fontSize(22).text(title, { align: 'center' });
      if (subtitle) {
        doc.fillColor('#6b7280').font('Helvetica').fontSize(11).text(subtitle, { align: 'center' });
      }
      doc.moveDown(0.5);
      doc
        .moveTo(72, doc.y)
        .lineTo(doc.page.width - 72, doc.y)
        .strokeColor('#e5e7eb')
        .lineWidth(0.5)
        .stroke();
      doc.moveDown(0.8);

      for (const rawLine of content.split('\n')) {
        const line = rawLine.trim();
        if (!line) {
          doc.moveDown(0.4);
          continue;
        }
        const isHeader =
          (line === line.toUpperCase() && line.length > 2 && line.length < 60) ||
          (line.endsWith(':') && line.length < 50);
        if (isHeader) {
          doc.moveDown(0.5).fillColor('#111827').font('Helvetica-Bold').fontSize(12).text(line);
          const width = doc.widthOfString(line);
          doc
            .moveTo(72, doc.y + 1)
            .lineTo(72 + width, doc.y + 1)
            .strokeColor('#93c5fd')
            .lineWidth(1)
            .stroke();
          doc.moveDown(0.3);
        } else if (/^[•*-]/.test(line)) {
          doc
            .fillColor('#374151')
            .font('Helvetica')
            .fontSize(10)
            .text(line, { indent: 14, lineGap: 2 });
        } else {
          doc.fillColor('#374151').font('Helvetica').fontSize(10).text(line, { lineGap: 2 });
        }
      }

      doc
        .fillColor('#9ca3af')
        .font('Helvetica')
        .fontSize(8)
        .text(
          `Generated by JobIN · ${new Date().toLocaleDateString('en-GB', { dateStyle: 'long' })}`,
          72,
          doc.page.height - 48,
          { align: 'center', width: doc.page.width - 144 },
        );
      doc.end();
    });
  }

  private async generateAtsPdf(options: ExportOptions): Promise<Buffer> {
    const layout = getResumeLayout(options);
    const lines = getResumeLines(options.content).filter((line) => line.length > 0);
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      margin: layout.marginInches * 72,
      size: layout.pageSize,
      bufferPages: true,
      info: { Title: options.title, Author: options.author ?? 'JobIN candidate' },
    });

    return new Promise((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      let start = 0;
      let inSkills = false;
      if (lines.length && isLikelyName(lines[0])) {
        doc.font('Helvetica-Bold').fontSize(19).fillColor(`#${layout.accent}`);
        writePdfText(doc, lines[0], { align: 'center' });
        start = 1;
        if (lines[start] && !isLikelyContact(lines[start]) && !isSectionHeading(lines[start])) {
          doc
            .moveDown(0.1)
            .font('Helvetica-Bold')
            .fontSize(11)
            .text(lines[start], { align: 'center' });
          start += 1;
        }
        while (lines[start] && isLikelyContact(lines[start])) {
          doc.moveDown(0.1).font('Helvetica').fontSize(9);
          writePdfText(doc, lines[start], { align: 'center' });
          start += 1;
        }
        doc.moveDown(0.25);
      } else {
        doc
          .font('Helvetica-Bold')
          .fontSize(16)
          .fillColor('#111111')
          .text(options.title, { align: 'center' });
        doc.moveDown(0.25);
      }

      for (const line of lines.slice(start)) {
        if (isSectionHeading(line)) {
          inSkills = /skills/i.test(line);
          if (doc.y + 42 > doc.page.height - doc.page.margins.bottom) doc.addPage();
          doc
            .moveDown(0.42)
            .font('Helvetica-Bold')
            .fontSize(10.5)
            .fillColor(`#${layout.accent}`)
            .text(line.replace(/:$/, '').toUpperCase());
          const y = doc.y + 1;
          doc
            .moveTo(doc.page.margins.left, y)
            .lineTo(doc.page.width - doc.page.margins.right, y)
            .strokeColor(`#${layout.rule}`)
            .lineWidth(0.7)
            .stroke();
          doc.moveDown(0.22);
        } else if (isBullet(line)) {
          doc.font('Helvetica').fontSize(layout.fontSize).fillColor('#111111');
          writePdfText(doc, `- ${bulletText(line)}`, {
            indent: 12,
            hanging: 9,
            lineGap: 2,
            paragraphGap: 2,
          });
        } else {
          const pair = splitResumePair(line);
          if (pair) {
            doc.font('Helvetica').fontSize(layout.fontSize).fillColor('#111111');
            writePdfText(doc, `${pair[0]} | ${pair[1]}`, { lineGap: 2 });
          } else {
            const label = inSkills ? splitLabeledLine(line) : null;
            if (label) {
              doc
                .font('Helvetica-Bold')
                .fontSize(layout.fontSize)
                .fillColor('#111111')
                .text(`${label[0]}: `, { continued: true });
              doc.font('Helvetica');
              writePdfText(doc, label[1], { lineGap: 2 });
            } else {
              doc.font('Helvetica').fontSize(layout.fontSize).fillColor('#111111');
              writePdfText(doc, line, { lineGap: 2 });
            }
          }
        }
      }

      const pageRange = doc.bufferedPageRange();
      for (
        let pageIndex = pageRange.start;
        pageIndex < pageRange.start + pageRange.count;
        pageIndex += 1
      ) {
        doc.switchToPage(pageIndex);
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor('#68756d')
          .text(
            `Page ${pageIndex + 1} of ${pageRange.count}`,
            doc.page.margins.left,
            doc.page.height - 35,
            {
              width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
              align: 'center',
            },
          );
      }
      doc.end();
    });
  }

  // Companion LaTeX source uses plain sections, a single column, and ordinary bullet lists.
  generateLatex(options: ExportOptions): string {
    const layout = getResumeLayout(options);
    const classSize = layout.fontSize >= 10.1 ? 11 : layout.fontSize < 9.9 ? 9 : 10;
    const paper = layout.pageSize === 'LETTER' ? 'letterpaper' : 'a4paper';
    const lines = getResumeLines(options.content).filter((line) => line.length > 0);
    const output = [
      `\\documentclass[${classSize}pt,${paper}]{article}`,
      `\\usepackage[margin=${layout.marginInches.toFixed(2)}in]{geometry}`,
      '\\usepackage[T1]{fontenc}',
      '\\usepackage[utf8]{inputenc}',
      '\\usepackage{xcolor}',
      '\\usepackage{enumitem}',
      '\\usepackage{titlesec}',
      '\\usepackage{needspace}',
      '\\usepackage{fancyhdr}',
      '\\usepackage[colorlinks=true]{hyperref}',
      `\\definecolor{resumeaccent}{HTML}{${layout.accent}}`,
      `\\definecolor{resumerule}{HTML}{${layout.rule}}`,
      ...(layout.fontFamily === 'sans'
        ? ['\\usepackage{helvet}', '\\renewcommand{\\familydefault}{\\sfdefault}']
        : []),
      '\\hypersetup{colorlinks=true,linkcolor=resumeaccent,urlcolor=resumeaccent}',
      '\\pagestyle{fancy}',
      '\\fancyhf{}',
      '\\fancyfoot[C]{\\small\\color{gray}\\thepage}',
      '\\renewcommand{\\headrulewidth}{0pt}',
      '\\setlength{\\parindent}{0pt}',
      '\\setlength{\\parskip}{3pt}',
      '\\clubpenalty=10000',
      '\\widowpenalty=10000',
      '\\setlist[itemize]{leftmargin=1.25em,itemsep=1pt,topsep=2pt,parsep=0pt}',
      '\\titleformat{\\section}{\\color{resumeaccent}\\normalsize\\bfseries}{}{0pt}{}[\\color{resumerule}\\titlerule]',
      '\\titlespacing*{\\section}{0pt}{7pt}{3pt}',
      `\\hypersetup{pdftitle={${latexEscape(options.title)}},pdfauthor={${latexEscape(options.author ?? 'JobIN candidate')}}}`,
      '\\begin{document}',
    ];

    let start = 0;
    if (lines.length && isLikelyName(lines[0])) {
      output.push(`{\\centering\\Large\\bfseries ${latexEscape(lines[0])}\\par}`);
      start = 1;
      if (lines[start] && !isLikelyContact(lines[start]) && !isSectionHeading(lines[start])) {
        output.push(`{\\centering\\bfseries ${latexEscape(lines[start])}\\par}`);
        start += 1;
      }
      while (lines[start] && isLikelyContact(lines[start])) {
        output.push(`{\\centering\\small ${latexText(lines[start])}\\par}`);
        start += 1;
      }
      output.push('\\vspace{4pt}');
    } else {
      output.push(`{\\centering\\Large\\bfseries ${latexEscape(options.title)}\\par}`);
      output.push('\\vspace{4pt}');
    }

    let inList = false;
    let inSkills = false;
    for (const line of lines.slice(start)) {
      if (isBullet(line)) {
        if (!inList) {
          output.push('\\begin{itemize}');
          inList = true;
        }
        output.push(`\\item ${latexText(bulletText(line))}`);
      } else {
        if (inList) {
          output.push('\\end{itemize}');
          inList = false;
        }
        if (isSectionHeading(line)) {
          inSkills = /skills/i.test(line);
          output.push('\\Needspace{3\\baselineskip}');
          output.push(`\\section*{${latexEscape(line.replace(/:$/, ''))}}`);
        } else {
          const pair = splitResumePair(line);
          const label = inSkills ? splitLabeledLine(line) : null;
          if (pair) {
            output.push('\\Needspace{3\\baselineskip}');
            output.push(`\\textbf{${latexEscape(pair[0])}}\\hfill ${latexText(pair[1])}\\par`);
          } else if (label) {
            output.push(`\\textbf{${latexEscape(label[0])}:} ${latexText(label[1])}\\par`);
          } else {
            output.push(`${latexText(line)}\\par`);
          }
        }
      }
    }
    if (inList) output.push('\\end{itemize}');
    output.push('\\end{document}', '');
    return output.join('\n');
  }

  // ATS DOCX: semantic heading and list paragraphs, one column, standard Arial font.
  async generateDocx(options: ExportOptions): Promise<Buffer> {
    if (options.atsFriendly) return this.generateAtsDocx(options);

    const { title, subtitle, content } = options;
    const children: Paragraph[] = [
      new Paragraph({
        children: [new TextRun({ text: title, bold: true, size: 36, color: '1e40af' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
    ];

    if (subtitle) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: subtitle, size: 20, color: '6b7280' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'e5e7eb' } },
        }),
      );
    }

    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();
      if (!line) {
        children.push(new Paragraph({ spacing: { before: 60, after: 60 } }));
        continue;
      }
      const isHeader =
        (line === line.toUpperCase() && line.length > 2 && line.length < 60) ||
        (line.endsWith(':') && line.length < 50);
      if (isHeader) {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: line, bold: true, size: 24, color: '111827' })],
            spacing: { before: 240, after: 80 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: '93c5fd' } },
          }),
        );
      } else if (/^[•*-]/.test(line)) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ text: line.replace(/^[•*-]\s*/, ''), size: 20, color: '374151' }),
            ],
            spacing: { after: 40 },
            indent: { left: convertInchesToTwip(0.25) },
          }),
        );
      } else {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: line, size: 20, color: '374151' })],
            spacing: { after: 60 },
          }),
        );
      }
    }

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated by JobIN · ${new Date().toLocaleDateString('en-GB', { dateStyle: 'long' })}`,
            size: 16,
            color: '9ca3af',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 480 },
      }),
    );

    const doc = new Document({
      creator: 'JobIN',
      title,
      description: 'Generated by JobIN AI',
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
              },
            },
          },
          children,
        },
      ],
    });
    return Packer.toBuffer(doc);
  }

  private async generateAtsDocx(options: ExportOptions): Promise<Buffer> {
    const layout = getResumeLayout(options);
    const lines = getResumeLines(options.content).filter((line) => line.length > 0);
    const children: Paragraph[] = [];
    let start = 0;

    if (lines.length && isLikelyName(lines[0])) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: lines[0],
              bold: true,
              size: Math.round((layout.fontSize + 7) * 2),
              font: layout.fontFamily === 'sans' ? 'Arial' : 'Times New Roman',
              color: layout.accent,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
        }),
      );
      start = 1;
      if (lines[start] && !isLikelyContact(lines[start]) && !isSectionHeading(lines[start])) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: lines[start],
                bold: true,
                size: Math.round((layout.fontSize + 1) * 2),
                font: layout.fontFamily === 'sans' ? 'Arial' : 'Times New Roman',
                color: layout.accent,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
          }),
        );
        start += 1;
      }
      while (lines[start] && isLikelyContact(lines[start])) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: lines[start],
                size: Math.round(layout.fontSize * 2),
                font: layout.fontFamily === 'sans' ? 'Arial' : 'Times New Roman',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
          }),
        );
        start += 1;
      }
    } else {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: options.title,
              bold: true,
              size: Math.round((layout.fontSize + 7) * 2),
              font: layout.fontFamily === 'sans' ? 'Arial' : 'Times New Roman',
              color: layout.accent,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 180 },
        }),
      );
    }

    let inSkills = false;
    for (const line of lines.slice(start)) {
      if (isSectionHeading(line)) {
        inSkills = /skills/i.test(line);
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: line.replace(/:$/, '').toUpperCase(),
                bold: true,
                size: Math.round(layout.fontSize * 2),
                font: layout.fontFamily === 'sans' ? 'Arial' : 'Times New Roman',
              }),
            ],
            spacing: { before: 140, after: 35 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: layout.accent } },
          }),
        );
      } else if (isBullet(line)) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `- ${bulletText(line)}`,
                size: Math.round(layout.fontSize * 2),
                font: layout.fontFamily === 'sans' ? 'Arial' : 'Times New Roman',
              }),
            ],
            spacing: { after: 25 },
            indent: { left: convertInchesToTwip(0.25) },
          }),
        );
      } else {
        const pair = splitResumePair(line);
        const label = inSkills ? splitLabeledLine(line) : null;
        children.push(
          new Paragraph({
            children: pair
              ? [
                  new TextRun({
                    text: pair[0],
                    bold: true,
                    size: Math.round(layout.fontSize * 2),
                    font: layout.fontFamily === 'sans' ? 'Arial' : 'Times New Roman',
                  }),
                  new TextRun({
                    text: ` | ${pair[1]}`,
                    size: Math.round(layout.fontSize * 2),
                    font: layout.fontFamily === 'sans' ? 'Arial' : 'Times New Roman',
                  }),
                ]
              : label
                ? [
                    new TextRun({
                      text: `${label[0]}: `,
                      bold: true,
                      size: Math.round(layout.fontSize * 2),
                      font: layout.fontFamily === 'sans' ? 'Arial' : 'Times New Roman',
                    }),
                    new TextRun({
                      text: label[1],
                      size: Math.round(layout.fontSize * 2),
                      font: layout.fontFamily === 'sans' ? 'Arial' : 'Times New Roman',
                    }),
                  ]
                : [
                    new TextRun({
                      text: line,
                      size: Math.round(layout.fontSize * 2),
                      font: layout.fontFamily === 'sans' ? 'Arial' : 'Times New Roman',
                    }),
                  ],
            spacing: { after: 35 },
          }),
        );
      }
    }

    const doc = new Document({
      creator: 'JobIN',
      title: options.title,
      description: 'ATS-friendly tailored resume',
      styles: {
        default: {
          document: {
            run: {
              font: layout.fontFamily === 'sans' ? 'Arial' : 'Times New Roman',
              size: Math.round(layout.fontSize * 2),
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              size:
                layout.pageSize === 'LETTER'
                  ? { width: 12240, height: 15840 }
                  : { width: 11906, height: 16838 },
              margin: {
                top: convertInchesToTwip(layout.marginInches),
                bottom: convertInchesToTwip(layout.marginInches),
                left: convertInchesToTwip(layout.marginInches),
                right: convertInchesToTwip(layout.marginInches),
              },
            },
          },
          children,
        },
      ],
    });
    return Packer.toBuffer(doc);
  }

  toFilename(base: string, ext: 'pdf' | 'docx' | 'tex'): string {
    return `${base
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 80)}.${ext}`;
  }
}
