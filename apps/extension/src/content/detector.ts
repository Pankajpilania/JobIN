import type { JobBoard } from '../shared/types';

// ─── URL pattern definitions ──────────────────────────────────────────────────

const PATTERNS: { board: JobBoard; patterns: RegExp[] }[] = [
  {
    board: 'linkedin',
    patterns: [
      /linkedin\.com\/jobs\/(view|search)/i,
      /linkedin\.com\/jobs\/collections/i,
    ],
  },
  {
    board: 'indeed',
    patterns: [
      /indeed\.com\/viewjob/i,
      /indeed\.com\/rc\/clk/i,
      /indeed\.co\.uk\/viewjob/i,
      /indeed\.com\/jobs/i,
    ],
  },
  {
    board: 'reed',
    patterns: [
      /reed\.co\.uk\/jobs\//i,
    ],
  },
  {
    board: 'totaljobs',
    patterns: [
      /totaljobs\.com\/job\//i,
      /totaljobs\.com\/jobs\//i,
    ],
  },
  {
    board: 'glassdoor',
    patterns: [
      /glassdoor\.co\.uk\/job-listing\//i,
      /glassdoor\.com\/job-listing\//i,
    ],
  },
  {
    board: 'greenhouse',
    patterns: [
      /boards\.greenhouse\.io\//i,
    ],
  },
  {
    board: 'lever',
    patterns: [
      /jobs\.lever\.co\//i,
    ],
  },
  {
    board: 'workday',
    patterns: [
      /\.myworkdayjobs\.com\//i,
      /\.workday\.com\/.*\/job\//i,
    ],
  },
];

/**
 * Detect which job board (if any) the current page belongs to.
 * Returns the board name, or 'unknown' if no match.
 */
export function detectBoard(url: string = location.href): JobBoard {
  for (const { board, patterns } of PATTERNS) {
    if (patterns.some(p => p.test(url))) return board;
  }
  return 'unknown';
}

/** Returns true if this page is a detectable job listing. */
export function isJobPage(url: string = location.href): boolean {
  return detectBoard(url) !== 'unknown';
}

/** Returns true if this is an ATS application form page. */
export function isAutofillPage(url: string = location.href): boolean {
  return ['greenhouse', 'lever', 'workday'].includes(detectBoard(url));
}
