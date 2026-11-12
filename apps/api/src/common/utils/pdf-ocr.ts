import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const MAX_OCR_PAGES = 6;

/** OCR a scanned PDF using Poppler and Tesseract installed on the API host. */
export async function ocrPdf(buffer: Buffer): Promise<string> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'jobin-resume-ocr-'));
  const inputPath = path.join(tempDir, 'resume.pdf');
  const outputPrefix = path.join(tempDir, 'page');

  try {
    await writeFile(inputPath, buffer, { mode: 0o600 });
    await execFileAsync(
      process.env.PDFTOPPM_PATH || 'pdftoppm',
      ['-f', '1', '-l', String(MAX_OCR_PAGES), '-r', '180', '-png', inputPath, outputPrefix],
      { timeout: 30_000, maxBuffer: 1024 * 1024, windowsHide: true },
    );

    const pages = (await readdir(tempDir))
      .filter((name) => /^page-\d+\.png$/i.test(name))
      .sort((left, right) => Number(left.match(/\d+/)?.[0]) - Number(right.match(/\d+/)?.[0]))
      .slice(0, MAX_OCR_PAGES);

    const text: string[] = [];
    for (const page of pages) {
      const { stdout } = await execFileAsync(
        process.env.TESSERACT_PATH || 'tesseract',
        [
          path.join(tempDir, page),
          'stdout',
          '-l',
          process.env.OCR_LANGUAGES || 'eng',
          '--psm',
          '3',
        ],
        { timeout: 20_000, maxBuffer: 2 * 1024 * 1024, windowsHide: true, encoding: 'utf8' },
      );
      if (stdout.trim()) text.push(stdout.trim());
    }
    return text.join('\n\n');
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
