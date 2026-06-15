import type { JobBoard, DetectedJob } from '../shared/types';

// ─── Selector maps per job board ──────────────────────────────────────────────

interface SelectorMap {
  title:       string[];
  company:     string[];
  location:    string[];
  salary:      string[];
  description: string[];
}

const SELECTORS: Partial<Record<JobBoard, SelectorMap>> = {
  linkedin: {
    title:   [
      'h1.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title h1',
      'h1.t-24.t-bold',
    ],
    company: [
      '.job-details-jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name a',
      '.topcard__org-name-link',
    ],
    location: [
      '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
      '.jobs-unified-top-card__bullet',
      '.topcard__flavor--bullet',
    ],
    salary: [
      '.compensation__salary',
      '.jobs-unified-top-card__job-insight--highlight span',
    ],
    description: [
      '#job-details',
      '.jobs-description__content',
      '.jobs-box__html-content',
    ],
  },

  indeed: {
    title:   ['h1.jobsearch-JobInfoHeader-title', 'h1[data-testid="job-title"]', '.jobsearch-JobInfoHeader-title'],
    company: ['.jobsearch-CompanyInfoContainer .jobsearch-CompanyInfoWithoutHeaderImage', '[data-testid="inlineHeader-companyName"] a', '.jobsearch-InlineCompanyRating a'],
    location:['[data-testid="job-location"]', '.jobsearch-JobInfoHeader-subtitle div:last-child'],
    salary:  ['[data-testid="attribute_snippet_testid"]', '#salaryInfoAndJobType .css-19j1a75'],
    description: ['#jobDescriptionText', '[id="jobDescriptionText"]'],
  },

  reed: {
    title:   ['h1.job-header__title', '[data-qa="job-title"]'],
    company: ['[data-qa="job-employer"]', '.job-header__company'],
    location:['[data-qa="job-location"]', '.location-and-salary span:first-child'],
    salary:  ['[data-qa="job-salary"]', '.salary'],
    description: ['[data-qa="job-description"]', '#job-description'],
  },

  totaljobs: {
    title:   ['h1.job-title', '.job-header__title'],
    company: ['.brand', '.job-header__company'],
    location:['.location', '.icon--pin ~ span'],
    salary:  ['.salary', '.icon--salary ~ span'],
    description: ['.job-description', '#job-description'],
  },

  glassdoor: {
    title:   ['h1[data-test="job-title"]', '.job-title'],
    company: ['[data-test="employer-name"]', '.employer-name'],
    location:['[data-test="location"]', '.location'],
    salary:  ['[data-test="detailSalary"]', '.salary'],
    description: ['[data-test="jobDescriptionContent"]', '#JobDescriptionContainer'],
  },

  greenhouse: {
    title:   ['h1.app-title', 'h1.posting-headline h1', 'h2.posting-headline'],
    company: ['.company-name', '.posting-company'],
    location:['.location', '.posting-location'],
    salary:  ['.salary-range'],
    description: ['#content', '.posting-description'],
  },

  lever: {
    title:   ['.posting-headline h2', 'h2'],
    company: ['.posting-headline .company-name', '.main-header-logo + h1'],
    location:['.posting-categories .location', '.posting-department'],
    salary:  ['.posting-salary'],
    description: ['.posting-description', '.content-wrapper .section-wrapper:first-child'],
  },
};

// ─── Helper functions ─────────────────────────────────────────────────────────

/** Try each selector in order, return first match's text content. */
function extractText(selectors: string[], root: Document = document): string {
  for (const sel of selectors) {
    try {
      const el = root.querySelector(sel);
      if (el) return el.textContent?.trim() ?? '';
    } catch { /* invalid selector — skip */ }
  }
  return '';
}

/** Try each selector, return combined innerText (for multi-paragraph descriptions). */
function extractBlock(selectors: string[], root: Document = document): string {
  for (const sel of selectors) {
    try {
      const el = root.querySelector(sel);
      if (el) {
        // Convert to plain text while preserving line breaks
        return (el as HTMLElement).innerText?.trim()
          ?? el.textContent?.trim()
          ?? '';
      }
    } catch { /* skip */ }
  }
  return '';
}

/**
 * Heuristic label scanner — finds an input by its associated label text.
 * Used as a fallback when the exact selector doesn't match.
 */
export function findInputByLabel(labelTextPattern: RegExp): HTMLElement | null {
  const labels = Array.from(document.querySelectorAll('label'));
  const target = labels.find(label =>
    labelTextPattern.test(label.textContent?.toLowerCase() ?? ''),
  );
  if (!target) return null;
  const forId = target.getAttribute('for');
  if (forId) return document.getElementById(forId) as HTMLElement;
  return target.querySelector('input, select, textarea') as HTMLElement;
}

// ─── Main extractor ───────────────────────────────────────────────────────────

/**
 * Extract job data from the current page for the given board.
 * Returns null if extraction fails or produces empty title + description.
 */
export function extractJob(board: JobBoard): DetectedJob | null {
  const sels = SELECTORS[board];
  if (!sels) return null;

  const jobTitle       = extractText(sels.title);
  const companyName    = extractText(sels.company);
  const location       = extractText(sels.location);
  const salary         = extractText(sels.salary);
  const jobDescription = extractBlock(sels.description);

  // Require at minimum a title or description to count as successful extraction
  if (!jobTitle && !jobDescription) return null;

  return {
    board,
    url:         location.href,
    jobTitle:    jobTitle    || 'Unknown Role',
    companyName: companyName || 'Unknown Company',
    location:    location    || '',
    salary:      salary      || '',
    jobDescription,
    extractedAt: Date.now(),
  };
}

/**
 * Wait for the DOM to stabilise before extracting (useful for SPAs).
 * Polls until a required selector appears or timeout.
 */
export async function extractWithRetry(
  board: JobBoard,
  maxRetries = 8,
  delayMs     = 600,
): Promise<DetectedJob | null> {
  for (let i = 0; i < maxRetries; i++) {
    const result = extractJob(board);
    if (result) return result;
    await new Promise(r => setTimeout(r, delayMs));
  }
  return null;
}
