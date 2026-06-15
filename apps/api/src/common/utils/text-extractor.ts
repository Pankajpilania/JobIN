import { Logger } from '@nestjs/common';

// CommonJS requires — both libraries have CJS builds
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';

const logger = new Logger('TextExtractor');

/** Supported MIME types for resume parsing */
export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

/**
 * Extracts plain text from a PDF or DOCX buffer.
 *
 * @param buffer   Raw file bytes from memory storage or S3
 * @param mimeType MIME type to determine which parser to use
 * @returns        Extracted plain text, trimmed and cleaned
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  try {
    if (mimeType === 'application/pdf') {
      const data = await pdfParse(buffer);
      return cleanText(data.text);
    }

    if (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const { value } = await mammoth.extractRawText({ buffer });
      return cleanText(value);
    }

    logger.warn(`Unsupported MIME type for text extraction: ${mimeType}`);
    return '';
  } catch (err) {
    logger.error(`Text extraction failed for ${mimeType}: ${err.message}`);
    // Return empty string — we still store the resume, analysis just won't run
    return '';
  }
}

/** Remove excess whitespace and control characters from extracted text */
function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')           // normalise line endings
    .replace(/[ \t]+/g, ' ')          // collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n')       // max two consecutive blank lines
    .trim();
}
