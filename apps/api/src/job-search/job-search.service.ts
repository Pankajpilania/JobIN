import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { JobTrackerService } from '../job-tracker/job-tracker.service';
import { SearchJobsDto } from './dto/search-jobs.dto';

export interface SearchJob {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  description: string;
  salary?: string;
  postedAt?: string;
  source: string;
  tags: string[];
}

interface SourceResult {
  name: string;
  attributionUrl: string;
  jobs: SearchJob[];
}

export interface JobSearchResponse {
  jobs: SearchJob[];
  sources: Array<{ name: string; attributionUrl: string }>;
  sourceErrors: Array<{ name: string; error: string }>;
  importSummary: { imported: number; skipped: number } | null;
}

interface CacheEntry {
  jobs: SearchJob[];
  expiresAt: number;
}

interface ArbeitnowResponse {
  data?: Array<Record<string, unknown>>;
  links?: { next?: string | null };
}

interface RemotiveResponse {
  jobs?: Array<Record<string, unknown>>;
}

@Injectable()
export class JobSearchService {
  private readonly logger = new Logger(JobSearchService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<SearchJob[]>>();
  private remotiveLastRequestedAt = 0;

  constructor(private readonly jobTrackerService: JobTrackerService) {}

  async search(userId: string, dto: SearchJobsDto): Promise<JobSearchResponse> {
    const sources: Array<{
      name: string;
      attributionUrl: string;
      load: () => Promise<SearchJob[]>;
    }> = [
      {
        name: 'Arbeitnow',
        attributionUrl: 'https://www.arbeitnow.com/',
        load: () => this.getArbeitnowJobs(),
      },
      {
        name: 'Remotive',
        attributionUrl: 'https://remotive.com/',
        load: () => this.getRemotiveJobs(),
      },
      ...this.getConfiguredBoards(),
    ];

    const sourceResults = await Promise.all(
      sources.map(async (source): Promise<SourceResult | { name: string; error: string }> => {
        try {
          return {
            name: source.name,
            attributionUrl: source.attributionUrl,
            jobs: await source.load(),
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown source error';
          this.logger.warn(`${source.name} job feed failed: ${message}`);
          return { name: source.name, error: 'This source is temporarily unavailable.' };
        }
      }),
    );

    const successfulSources = sourceResults.filter(
      (source): source is SourceResult => 'jobs' in source,
    );
    const sourceErrors = sourceResults
      .filter((source): source is { name: string; error: string } => 'error' in source)
      .map(({ name, error }) => ({ name, error }));

    if (successfulSources.length === 0) {
      throw new ServiceUnavailableException(
        'Job sources are temporarily unavailable. Please try again later.',
      );
    }

    const queryTerms = dto.query?.trim().toLowerCase().split(/\s+/).filter(Boolean) ?? [];
    const location = dto.location?.trim().toLowerCase() ?? '';
    const seenUrls = new Set<string>();
    const jobs = successfulSources
      .flatMap((source) => source.jobs)
      .filter((job) => {
        if (!job.url) return false;
        const searchableText = [job.title, job.company, job.location, job.description, ...job.tags]
          .join(' ')
          .toLowerCase();
        if (queryTerms.some((term) => !searchableText.includes(term))) return false;
        if (location && !job.location.toLowerCase().includes(location)) return false;
        if (dto.remoteOnly && !job.remote) return false;

        const normalizedUrl = normalizeUrl(job.url);
        if (seenUrls.has(normalizedUrl)) return false;
        seenUrls.add(normalizedUrl);
        return true;
      })
      .sort((a, b) => (b.postedAt ?? '').localeCompare(a.postedAt ?? ''))
      .slice(0, dto.limit);

    const importSummary = dto.autoImport
      ? await this.jobTrackerService.importSearchResults(
          userId,
          jobs.map((job) => ({
            jobTitle: job.title,
            companyName: job.company,
            location: job.location,
            jobUrl: job.url,
            jobDescription: job.description,
            salary: job.salary,
            source: job.source,
          })),
        )
      : null;

    return {
      jobs,
      sources: successfulSources.map(({ name, attributionUrl }) => ({ name, attributionUrl })),
      sourceErrors,
      importSummary,
    };
  }

  private async getArbeitnowJobs(): Promise<SearchJob[]> {
    return this.getCached('arbeitnow', 15 * 60 * 1000, async () => {
      const pages: ArbeitnowResponse[] = await Promise.all(
        [1, 2].map((page) =>
          this.fetchJson<ArbeitnowResponse>(
            `https://www.arbeitnow.com/api/job-board-api?page=${page}`,
          ),
        ),
      );
      return pages.flatMap((page) => (page.data ?? []).map((job) => this.normalizeArbeitnow(job)));
    });
  }

  private async getRemotiveJobs(): Promise<SearchJob[]> {
    return this.getCached('remotive', 8 * 60 * 60 * 1000, async () => {
      const minimumInterval = 6 * 60 * 60 * 1000;
      if (Date.now() - this.remotiveLastRequestedAt < minimumInterval) {
        throw new Error('Remotive refresh is limited to once every six hours.');
      }
      this.remotiveLastRequestedAt = Date.now();
      const response = await this.fetchJson<RemotiveResponse>(
        'https://remotive.com/api/remote-jobs?limit=100',
      );
      return (response.jobs ?? []).map((job) => this.normalizeRemotive(job));
    });
  }

  private getConfiguredBoards() {
    const greenhouseBoards = this.readBoardSlugs('JOB_SEARCH_GREENHOUSE_BOARDS');
    const leverBoards = this.readBoardSlugs('JOB_SEARCH_LEVER_BOARDS');
    return [
      ...greenhouseBoards.map((board) => ({
        name: `Greenhouse (${board})`,
        attributionUrl: `https://boards.greenhouse.io/${encodeURIComponent(board)}`,
        load: () =>
          this.getCached(`greenhouse:${board}`, 15 * 60 * 1000, async () => {
            const response = await this.fetchJson<{ jobs?: Array<Record<string, unknown>> }>(
              `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`,
            );
            return (response.jobs ?? []).map((job) => this.normalizeGreenhouse(job, board));
          }),
      })),
      ...leverBoards.map((board) => ({
        name: `Lever (${board})`,
        attributionUrl: `https://jobs.lever.co/${encodeURIComponent(board)}`,
        load: () =>
          this.getCached(`lever:${board}`, 15 * 60 * 1000, async () => {
            const response = await this.fetchJson<Array<Record<string, unknown>>>(
              `https://api.lever.co/v0/postings/${encodeURIComponent(board)}?mode=json`,
            );
            return response.map((job) => this.normalizeLever(job, board));
          }),
      })),
    ];
  }

  private readBoardSlugs(variable: string): string[] {
    return (process.env[variable] ?? '')
      .split(',')
      .map((board) => board.trim())
      .filter((board) => /^[a-zA-Z0-9_-]{1,80}$/.test(board))
      .slice(0, 20);
  }

  private getCached(
    key: string,
    ttlMs: number,
    load: () => Promise<SearchJob[]>,
  ): Promise<SearchJob[]> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.jobs);

    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const request = load()
      .then((jobs) => {
        this.cache.set(key, { jobs, expiresAt: Date.now() + ttlMs });
        return jobs;
      })
      .finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, request);
    return request;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'JobIN job search' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Feed returned HTTP ${response.status}`);
    return (await response.json()) as T;
  }

  private normalizeArbeitnow(job: Record<string, unknown>): SearchJob {
    const tags = toStringArray(job.tags);
    const location = stringValue(job.location) || 'Location not specified';
    const description = stripHtml(stringValue(job.description));
    return {
      id: `arbeitnow:${stringValue(job.slug) || stringValue(job.url)}`,
      title: stringValue(job.title) || 'Untitled role',
      company: stringValue(job.company_name) || 'Company not specified',
      location,
      remote:
        job.remote === true || /remote/i.test(location) || tags.some((tag) => /remote/i.test(tag)),
      url: safeHttpUrl(job.url),
      description,
      salary: stringValue(job.salary) || undefined,
      postedAt: validDate(job.created_at, 'seconds'),
      source: 'Arbeitnow',
      tags,
    };
  }

  private normalizeRemotive(job: Record<string, unknown>): SearchJob {
    const location = stringValue(job.candidate_required_location) || 'Remote';
    return {
      id: `remotive:${stringValue(job.id)}`,
      title: stringValue(job.title) || 'Untitled role',
      company: stringValue(job.company_name) || 'Company not specified',
      location,
      remote: true,
      url: safeHttpUrl(job.url),
      description: stripHtml(stringValue(job.description)),
      salary: stringValue(job.salary) || undefined,
      postedAt: validDate(job.publication_date),
      source: 'Remotive',
      tags: [stringValue(job.category), stringValue(job.job_type)].filter(Boolean),
    };
  }

  private normalizeGreenhouse(job: Record<string, unknown>, board: string): SearchJob {
    const location =
      stringValue((job.location as Record<string, unknown> | undefined)?.name) ||
      'Location not specified';
    const content = stringValue(job.content);
    return {
      id: `greenhouse:${board}:${stringValue(job.id)}`,
      title: stringValue(job.title) || 'Untitled role',
      company: board,
      location,
      remote: /remote/i.test(location) || /remote/i.test(content),
      url: safeHttpUrl(job.absolute_url),
      description: stripHtml(content),
      postedAt: validDate(job.updated_at),
      source: 'Greenhouse',
      tags: [],
    };
  }

  private normalizeLever(job: Record<string, unknown>, board: string): SearchJob {
    const categories = job.categories as Record<string, unknown> | undefined;
    const location = stringValue(categories?.location) || 'Location not specified';
    const description = [stringValue(job.description), stringValue(job.descriptionPlain)]
      .filter(Boolean)
      .join('\n');
    return {
      id: `lever:${board}:${stringValue(job.id)}`,
      title: stringValue(job.text) || 'Untitled role',
      company: board,
      location,
      remote: /remote/i.test(location) || /remote/i.test(description),
      url: safeHttpUrl(job.hostedUrl),
      description: stripHtml(description),
      postedAt: validDate(job.createdAt),
      source: 'Lever',
      tags: [stringValue(categories?.team), stringValue(categories?.commitment)].filter(Boolean),
    };
  }
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function stripHtml(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20_000);
}

function safeHttpUrl(value: unknown): string {
  const url = stringValue(value);
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : '';
  } catch {
    return '';
  }
}

function validDate(
  value: unknown,
  numericUnit: 'milliseconds' | 'seconds' = 'milliseconds',
): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const timestamp = typeof value === 'number' && numericUnit === 'seconds' ? value * 1000 : value;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_')) url.searchParams.delete(key);
    }
    url.hash = '';
    url.pathname = url.pathname.replace(/\/$/, '');
    return url.href;
  } catch {
    return value;
  }
}
