import { Logger } from '@nestjs/common';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { ocrPdf } from './pdf-ocr';

const logger = new Logger('TextExtractor');

/** Supported MIME types for resume parsing */
export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/x-tex',
  'text/x-tex',
  'text/plain',
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

/**
 * Extracts plain text from a PDF or DOCX buffer.
 *
 * @param buffer   Raw file bytes from memory storage or S3
 * @param mimeType MIME type to determine which parser to use
 * @returns        Extracted plain text, trimmed and cleaned
 */
export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  const normalizedMimeType = mimeType.toLowerCase().split(';', 1)[0].trim();

  if (normalizedMimeType === 'application/pdf') {
    let extracted = '';
    try {
      const data = await pdfParse(buffer);
      extracted = cleanText(data.text);
    } catch (error) {
      logger.warn(`PDF text extraction failed; attempting OCR: ${errorMessage(error)}`);
    }

    if (extracted.length >= 80) return extracted;
    try {
      const recognized = cleanText(await ocrPdf(buffer));
      return recognized.length > extracted.length ? recognized : extracted;
    } catch (error) {
      logger.warn(`Scanned PDF OCR is unavailable or failed: ${errorMessage(error)}`);
      return extracted;
    }
  }

  if (
    normalizedMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    try {
      const { value } = await mammoth.extractRawText({ buffer });
      return cleanText(value);
    } catch (error) {
      logger.error(`DOCX text extraction failed: ${errorMessage(error)}`);
      return '';
    }
  }

  if (
    normalizedMimeType === 'application/x-tex' ||
    normalizedMimeType === 'text/x-tex' ||
    normalizedMimeType === 'text/plain'
  ) {
    return cleanText(extractLatexText(buffer.toString('utf8')));
  }

  logger.warn(`Unsupported MIME type for text extraction: ${mimeType}`);
  return '';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Convert common resume LaTeX commands to readable text without executing TeX. */
function extractLatexText(source: string): string {
  return source
    .replace(/(?<!\\)%[^\r\n]*/g, '')
    .replace(/\\href\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '$2 ($1)')
    .replace(/\\url\s*\{([^{}]*)\}/g, '$1')
    .replace(/\\(?:section|subsection|subsubsection|paragraph)\*?\s*\{([^{}]*)\}/g, '\n$1\n')
    .replace(/\\item(?:\s*\[[^\]]*\])?\s*/g, '\n- ')
    .replace(/\\(?:textbf|textit|emph|underline|texttt|textrm|textsf|mbox)\s*\{([^{}]*)\}/g, '$1')
    .replace(/\\(?:begin|end)\s*\{[^{}]*\}/g, '\n')
    .replace(/\\(?:smallskip|medskip|bigskip|vspace\*?|hspace\*?)\s*\{[^{}]*\}/g, ' ')
    .replace(/\\(?:newpage|clearpage|pagebreak)\b/g, '\n')
    .replace(/\\(?:par|newline)\b|\\\\/g, '\n')
    .replace(/\\(?:textbackslash|%|\$|#|_|&|\{|\})/g, (command) => {
      const decoded: Record<string, string> = {
        '\\textbackslash': '\\',
        '\\%': '%',
        '\\$': '$',
        '\\#': '#',
        '\\_': '_',
        '\\&': '&',
        '\\{': '{',
        '\\}': '}',
      };
      return decoded[command] ?? command;
    })
    .replace(/\\[a-zA-Z@]+\*?(?:\[[^\]]*\])?\s*/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/\\/g, '')
    .replace(/^[ \t]*[\[\]]+[ \t]*$/gm, '')
    .replace(/^[ \t]*[|]+[ \t]*$/gm, '');
}

/** Remove excess whitespace and control characters from extracted text */
function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n') // normalise line endings
    .replace(/[ \t]+/g, ' ') // collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n') // max two consecutive blank lines
    .trim()
    .slice(0, 40_000);
}
