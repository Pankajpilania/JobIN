import { Injectable } from '@nestjs/common';
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
  TabStopType,
  convertInchesToTwip,
} from 'docx';

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
  'additional information', 'additional skills', 'areas of expertise', 'career summary',
  'core competencies', 'key achievements', 'selected projects', 'soft skills',
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
  return (
    SECTION_HEADINGS.has(lower) ||
    (line.endsWith(':') && text.length > 2 && text.length < 60)
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
  return line.length <= 160 && (/@|https?:\/\/|linkedin\.com|github\.com|\+?\d[\d\s().-]{7,}/i.test(line));
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

interface ResumeTextPart {
  text: string;
  href?: string;
}

interface PdfTextWriter {
  text(text: string, options?: Record<string, unknown>): unknown;
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
  parts.forEach((part, index) => {
    doc.text(part.text, {
      ...(index === 0 ? options : {}),
      ...(part.href ? { link: part.href } : {}),
      continued: index < parts.length - 1,
    });
  });
}

function latexText(value: string): string {
  return splitLinkedText(value)
    .map((part) => {
      const label = latexEscape(part.text);
      if (!part.href) return label;
      return `\\href{${latexEscape(part.href)}}{${label}}`;
    })
    .join('');
}

@Injectable()
export class ExportService {
  // ATS resume PDF: one column, standard font, selectable text and familiar headings.
  async generatePdf(options: ExportOptions): Promise<Buffer> {
    if (options.atsFriendly) return this.generateAtsPdf(options);

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
      margin: 47,
      size: 'A4',
      info: { Title: options.title, Author: options.author ?? 'JobIN' },
    });

    return new Promise((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      let start = 0;
      let inSkills = false;
      if (lines.length && isLikelyName(lines[0])) {
        doc.font('Helvetica-Bold').fontSize(17).fillColor('#111111');
        writePdfText(doc, lines[0], { align: 'center' });
        start = 1;
        if (lines[start] && !isLikelyContact(lines[start]) && !isSectionHeading(lines[start])) {
          doc.moveDown(0.1).font('Helvetica-Bold').fontSize(10).text(lines[start], { align: 'center' });
          start += 1;
        }
        while (lines[start] && isLikelyContact(lines[start])) {
          doc.moveDown(0.1).font('Helvetica').fontSize(8.5);
          writePdfText(doc, lines[start], { align: 'center' });
          start += 1;
        }
        doc.moveDown(0.25);
      } else {
        doc.font('Helvetica-Bold').fontSize(16).fillColor('#111111').text(options.title, { align: 'center' });
        doc.moveDown(0.25);
      }

      for (const line of lines.slice(start)) {
        if (isSectionHeading(line)) {
          inSkills = /skills/i.test(line);
          doc.moveDown(0.3).font('Helvetica-Bold').fontSize(10).fillColor('#111111')
            .text(line.replace(/:$/, '').toUpperCase());
          const y = doc.y + 1;
          doc.moveTo(doc.page.margins.left, y)
            .lineTo(doc.page.width - doc.page.margins.right, y)
            .lineWidth(0.6)
            .stroke();
          doc.moveDown(0.15);
        } else if (isBullet(line)) {
          doc.font('Helvetica').fontSize(9.5).fillColor('#111111');
          writePdfText(doc, `- ${bulletText(line)}`, {
            indent: 12,
            hanging: 9,
            lineGap: 1,
          });
        } else {
          const pair = splitResumePair(line);
          if (pair) {
            doc.font('Helvetica').fontSize(9.5).fillColor('#111111');
            writePdfText(doc, `${pair[0]} | ${pair[1]}`, { lineGap: 1 });
          } else {
            const label = inSkills ? splitLabeledLine(line) : null;
            if (label) {
              doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#111111').text(`${label[0]}: `, { continued: true });
              doc.font('Helvetica');
              writePdfText(doc, label[1], { lineGap: 1 });
            } else {
              doc.font('Helvetica').fontSize(9.5).fillColor('#111111');
              writePdfText(doc, line, { lineGap: 1 });
            }
          }
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
      '\\usepackage[colorlinks=true,urlcolor=blue]{hyperref}',
      '\\pagestyle{empty}',
      '\\setlength{\\parindent}{0pt}',
      '\\setlength{\\parskip}{3pt}',
      '\\setlist[itemize]{leftmargin=1.25em,itemsep=1pt,topsep=2pt}',
      '\\titleformat{\\section}{\\normalsize\\bfseries}{}{0pt}{}[\\titlerule]',
      '\\titlespacing*{\\section}{0pt}{6pt}{2pt}',
      `\\hypersetup{pdftitle={${latexEscape(options.title)}},pdfauthor={${latexEscape(options.author ?? 'JobIN')}},colorlinks=true,urlcolor=blue}`,
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
          output.push(`\\section*{${latexEscape(line.replace(/:$/, ''))}}`);
        } else {
          const pair = splitResumePair(line);
          const label = inSkills ? splitLabeledLine(line) : null;
          if (pair) {
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
      if (lines[start] && !isLikelyContact(lines[start]) && !isSectionHeading(lines[start])) {
        children.push(new Paragraph({
          children: [new TextRun({ text: lines[start], bold: true, size: 20, font: 'Arial' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
        }));
        start += 1;
      }
      while (lines[start] && isLikelyContact(lines[start])) {
        children.push(new Paragraph({
          children: [new TextRun({ text: lines[start], size: 17, font: 'Arial' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
        }));
        start += 1;
      }
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: options.title, bold: true, size: 32, font: 'Arial' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
      }));
    }

    let inSkills = false;
    for (const line of lines.slice(start)) {
      if (isSectionHeading(line)) {
        inSkills = /skills/i.test(line);
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: line.replace(/:$/, '').toUpperCase(), bold: true, size: 20, font: 'Arial' })],
          spacing: { before: 140, after: 35 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '111111' } },
        }));
      } else if (isBullet(line)) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `- ${bulletText(line)}`, size: 19, font: 'Arial' })],
          spacing: { after: 25 },
          indent: { left: convertInchesToTwip(0.25) },
        }));
      } else {
        const pair = splitResumePair(line);
        const label = inSkills ? splitLabeledLine(line) : null;
        children.push(new Paragraph({
          children: pair
            ? [
                new TextRun({ text: pair[0], bold: true, size: 19, font: 'Arial' }),
                new TextRun({ text: '\t' }),
                new TextRun({ text: `| ${pair[1]}`, size: 19, font: 'Arial' }),
              ]
            : label
              ? [
                  new TextRun({ text: `${label[0]}: `, bold: true, size: 19, font: 'Arial' }),
                  new TextRun({ text: label[1], size: 19, font: 'Arial' }),
                ]
              : [new TextRun({ text: line, size: 19, font: 'Arial' })],
          ...(pair ? {
            tabStops: [{ type: TabStopType.RIGHT, position: convertInchesToTwip(6.95) }],
          } : {}),
          spacing: { after: 35 },
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
        left: convertInchesToTwip(0.65), right: convertInchesToTwip(0.65),
      } } }, children }],
    });
    return Packer.toBuffer(doc);
  }

  toFilename(base: string, ext: 'pdf' | 'docx' | 'tex'): string {
    return `${base.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_').slice(0, 80)}.${ext}`;
  }
}
