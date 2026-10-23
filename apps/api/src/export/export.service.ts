import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { promisify } from 'node:util';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
} from 'docx';

const execFileAsync = promisify(execFile);

export interface ExportOptions {
  title: string;
  subtitle?: string;
  content: string;
  author?: string;
  atsFriendly?: boolean;
}

const SECTION_HEADINGS = new Set([
  'summary', 'professional summary', 'profile', 'professional profile', 'objective',
  'experience', 'work experience', 'professional experience', 'employment history',
  'education', 'skills', 'technical skills', 'core skills', 'certifications',
  'licenses', 'projects', 'personal projects', 'achievements', 'awards', 'publications',
  'volunteer experience', 'languages', 'interests', 'references',
]);

function cleanResumeLine(line: string): string {
  return line
    .trim()
    .replace(/^#{1,6}\s+/, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[\u00a0\u200b]/g, ' ')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"');
}

function getResumeLines(content: string): string[] {
  return content.split(/\r?\n/).map(cleanResumeLine);
}

function isSectionHeading(line: string): boolean {
  const text = line.replace(/:$/, '').trim();
  const lower = text.toLowerCase();
  return (
    SECTION_HEADINGS.has(lower) ||
    (line.endsWith(':') && text.length > 2 && text.length < 60) ||
    (text.length > 2 && text.length < 60 && text === text.toUpperCase() && /[A-Z]/.test(text))
  );
}

function isBullet(line: string): boolean {
  return /^\s*[-*•‣▪]\s+/.test(line);
}

function bulletText(line: string): string {
  return line.replace(/^\s*[-*•‣▪]\s+/, '');
}

function isLikelyName(line: string): boolean {
  return (
    line.length > 0 && line.length <= 72 &&
    !isSectionHeading(line) && !isBullet(line) &&
    !/[.!?]$/.test(line) &&
    /^[\p{L}\p{M}0-9 ,.'&()-]+$/u.test(line)
  );
}

function isLikelyContact(line: string): boolean {
  return line.length <= 160 && (/@|https?:\/\/|\+?\d[\d\s().-]{7,}/i.test(line));
}

function latexEscape(value: string): string {
  const escaped: Record<string, string> = {
    '\\': '\\textbackslash{}',
    '{': '\\{',
    '}': '\\}',
    '$': '\\$',
    '&': '\\&',
    '#': '\\#',
    '%': '\\%',
    '_': '\\_',
    '~': '\\textasciitilde{}',
    '^': '\\textasciicircum{}',
  };
  return value.replace(/[\\{}$&#%_~^]/g, (character) => escaped[character]);
}

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  // ATS resume PDF: one column, standard font, selectable text and familiar headings.
  async generatePdf(options: ExportOptions): Promise<Buffer> {
    if (options.atsFriendly) {
      const compiled = await this.compileLatexPdf(this.generateLatex(options));
      if (compiled) return compiled;
      return this.generateAtsPdf(options);
    }

    const { title, subtitle, content, author } = options;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 72, size: 'A4', info: { Title: title, Author: author ?? 'JobIN' } });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fillColor('#1e40af').font('Helvetica-Bold').fontSize(22).text(title, { align: 'center' });
      if (subtitle) {
        doc.fillColor('#6b7280').font('Helvetica').fontSize(11).text(subtitle, { align: 'center' });
      }
      doc.moveDown(0.5);
      doc.moveTo(72, doc.y).lineTo(doc.page.width - 72, doc.y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      doc.moveDown(0.8);

      for (const rawLine of content.split('\n')) {
        const line = rawLine.trim();
        if (!line) { doc.moveDown(0.4); continue; }
        const isHeader =
          (line === line.toUpperCase() && line.length > 2 && line.length < 60) ||
          (line.endsWith(':') && line.length < 50);
        if (isHeader) {
          doc.moveDown(0.5).fillColor('#111827').font('Helvetica-Bold').fontSize(12).text(line);
          const width = doc.widthOfString(line);
          doc.moveTo(72, doc.y + 1).lineTo(72 + width, doc.y + 1).strokeColor('#93c5fd').lineWidth(1).stroke();
          doc.moveDown(0.3);
        } else if (/^[•*-]/.test(line)) {
          doc.fillColor('#374151').font('Helvetica').fontSize(10).text(line, { indent: 14, lineGap: 2 });
        } else {
          doc.fillColor('#374151').font('Helvetica').fontSize(10).text(line, { lineGap: 2 });
        }
      }

      doc.fillColor('#9ca3af').font('Helvetica').fontSize(8).text(
        `Generated by JobIN · ${new Date().toLocaleDateString('en-GB', { dateStyle: 'long' })}`,
        72,
        doc.page.height - 48,
        { align: 'center', width: doc.page.width - 144 },
      );
      doc.end();
    });
  }

  private async generateAtsPdf(options: ExportOptions): Promise<Buffer> {
    const lines = getResumeLines(options.content).filter((line) => line.length > 0);
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      margin: 52,
      size: 'A4',
      info: { Title: options.title, Author: options.author ?? 'JobIN' },
    });

    return new Promise((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      let start = 0;
      if (lines.length && isLikelyName(lines[0])) {
        doc.font('Helvetica-Bold').fontSize(18).fillColor('#111111').text(lines[0], { align: 'center' });
        start = 1;
        if (lines[start] && isLikelyContact(lines[start])) {
          doc.moveDown(0.15).font('Helvetica').fontSize(9).text(lines[start], { align: 'center' });
          start += 1;
        }
        doc.moveDown(0.5);
      } else {
        doc.font('Helvetica-Bold').fontSize(16).fillColor('#111111').text(options.title, { align: 'center' });
        doc.moveDown(0.5);
      }

      for (const line of lines.slice(start)) {
        if (isSectionHeading(line)) {
          doc.moveDown(0.45).font('Helvetica-Bold').fontSize(11).fillColor('#111111').text(line.replace(/:$/, ''));
          doc.moveDown(0.1);
        } else if (isBullet(line)) {
          doc.font('Helvetica').fontSize(9.5).fillColor('#111111').text(`- ${bulletText(line)}`, {
            indent: 10,
            hanging: 10,
            lineGap: 1.5,
          });
        } else {
          doc.font('Helvetica').fontSize(9.5).fillColor('#111111').text(line, { lineGap: 1.5 });
        }
      }

      doc.end();
    });
  }

  // Companion LaTeX source uses plain sections, a single column, and ordinary bullet lists.
  generateLatex(options: ExportOptions): string {
    const lines = getResumeLines(options.content).filter((line) => line.length > 0);
    const output = [
      '\\documentclass[10pt,a4paper]{article}',
      '\\usepackage[margin=0.65in]{geometry}',
      '\\usepackage[T1]{fontenc}',
      '\\usepackage[utf8]{inputenc}',
      '\\usepackage{enumitem}',
      '\\usepackage{titlesec}',
      '\\pagestyle{empty}',
      '\\setlength{\\parindent}{0pt}',
      '\\setlength{\\parskip}{3pt}',
      '\\setlist[itemize]{leftmargin=1.25em,itemsep=1pt,topsep=2pt}',
      '\\titleformat{\\section}{\\large\\bfseries}{}{0pt}{}',
      '\\titlespacing*{\\section}{0pt}{8pt}{3pt}',
      '\\begin{document}',
    ];

    let start = 0;
    if (lines.length && isLikelyName(lines[0])) {
      output.push(`{\\centering\\LARGE\\bfseries ${latexEscape(lines[0])}\\par}`);
      start = 1;
      if (lines[start] && isLikelyContact(lines[start])) {
        output.push(`{\\centering ${latexEscape(lines[start])}\\par}`);
        start += 1;
      }
      output.push('\\vspace{4pt}');
    } else {
      output.push(`{\\centering\\Large\\bfseries ${latexEscape(options.title)}\\par}`);
      output.push('\\vspace{4pt}');
    }

    let inList = false;
    for (const line of lines.slice(start)) {
      if (isBullet(line)) {
        if (!inList) {
          output.push('\\begin{itemize}');
          inList = true;
        }
        output.push(`\\item ${latexEscape(bulletText(line))}`);
      } else {
        if (inList) {
          output.push('\\end{itemize}');
          inList = false;
        }
        if (isSectionHeading(line)) {
          output.push(`\\section*{${latexEscape(line.replace(/:$/, ''))}}`);
        } else {
          output.push(`${latexEscape(line)}\\par`);
        }
      }
    }
    if (inList) output.push('\\end{itemize}');
    output.push('\\end{document}', '');
    return output.join('\n');
  }

  private async compileLatexPdf(source: string): Promise<Buffer | null> {
    const directory = await mkdtemp(join(tmpdir(), 'jobin-resume-'));
    const texPath = join(directory, 'resume.tex');
    try {
      await writeFile(texPath, source, 'utf8');
      const configuredPath = process.env.TECTONIC_PATH;
      const executable = configuredPath
        ? (isAbsolute(configuredPath) ? configuredPath : resolve(process.cwd(), configuredPath))
        : 'tectonic';
      await execFileAsync(executable, ['--keep-logs', 'resume.tex'], { cwd: directory, timeout: 50_000 });
      return await readFile(join(directory, 'resume.pdf'));
    } catch (error) {
      const errorCode = (error as NodeJS.ErrnoException).code;
      if (errorCode !== 'ENOENT') {
        this.logger.warn(`LaTeX compilation unavailable; using ATS PDF renderer: ${(error as Error).message}`);
      }
      return null;
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
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
      children.push(new Paragraph({
        children: [new TextRun({ text: subtitle, size: 20, color: '6b7280' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'e5e7eb' } },
      }));
    }

    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();
      if (!line) { children.push(new Paragraph({ spacing: { before: 60, after: 60 } })); continue; }
      const isHeader =
        (line === line.toUpperCase() && line.length > 2 && line.length < 60) ||
        (line.endsWith(':') && line.length < 50);
      if (isHeader) {
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: line, bold: true, size: 24, color: '111827' })],
          spacing: { before: 240, after: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: '93c5fd' } },
        }));
      } else if (/^[•*-]/.test(line)) {
        children.push(new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun({ text: line.replace(/^[•*-]\s*/, ''), size: 20, color: '374151' })],
          spacing: { after: 40 },
          indent: { left: convertInchesToTwip(0.25) },
        }));
      } else {
        children.push(new Paragraph({ children: [new TextRun({ text: line, size: 20, color: '374151' })], spacing: { after: 60 } }));
      }
    }

    children.push(new Paragraph({
      children: [new TextRun({ text: `Generated by JobIN · ${new Date().toLocaleDateString('en-GB', { dateStyle: 'long' })}`, size: 16, color: '9ca3af' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 480 },
    }));

    const doc = new Document({
      creator: 'JobIN',
      title,
      description: 'Generated by JobIN AI',
      sections: [{ properties: { page: { margin: {
        top: convertInchesToTwip(1), bottom: convertInchesToTwip(1),
        left: convertInchesToTwip(1), right: convertInchesToTwip(1),
      } } }, children }],
    });
    return Packer.toBuffer(doc);
  }

  private async generateAtsDocx(options: ExportOptions): Promise<Buffer> {
    const lines = getResumeLines(options.content).filter((line) => line.length > 0);
    const children: Paragraph[] = [];
    let start = 0;

    if (lines.length && isLikelyName(lines[0])) {
      children.push(new Paragraph({
        children: [new TextRun({ text: lines[0], bold: true, size: 34, font: 'Arial' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      }));
      start = 1;
      if (lines[start] && isLikelyContact(lines[start])) {
        children.push(new Paragraph({
          children: [new TextRun({ text: lines[start], size: 18, font: 'Arial' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 180 },
        }));
        start += 1;
      }
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: options.title, bold: true, size: 30, font: 'Arial' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
      }));
    }

    for (const line of lines.slice(start)) {
      if (isSectionHeading(line)) {
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: line.replace(/:$/, ''), bold: true, size: 22, font: 'Arial' })],
          spacing: { before: 180, after: 40 },
        }));
      } else if (isBullet(line)) {
        children.push(new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun({ text: bulletText(line), size: 19, font: 'Arial' })],
          spacing: { after: 30 },
          indent: { left: convertInchesToTwip(0.25) },
        }));
      } else {
        children.push(new Paragraph({
          children: [new TextRun({ text: line, size: 19, font: 'Arial' })],
          spacing: { after: 45 },
        }));
      }
    }

    const doc = new Document({
      creator: 'JobIN',
      title: options.title,
      description: 'ATS-friendly tailored resume',
      styles: { default: { document: { run: { font: 'Arial', size: 19 } } } },
      sections: [{ properties: { page: { margin: {
        top: convertInchesToTwip(0.65), bottom: convertInchesToTwip(0.65),
        left: convertInchesToTwip(0.7), right: convertInchesToTwip(0.7),
      } } }, children }],
    });
    return Packer.toBuffer(doc);
  }

  toFilename(base: string, ext: 'pdf' | 'docx' | 'tex'): string {
    return `${base.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_').slice(0, 80)}.${ext}`;
  }
}
