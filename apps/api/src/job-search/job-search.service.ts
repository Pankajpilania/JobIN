import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JobTrackerService } from '../job-tracker/job-tracker.service';
import { PrismaService } from '../prisma/prisma.service';
import { BrowseJobListingsDto } from './dto/browse-job-listings.dto';
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
  workplaceType?: string;
  employmentType?: string;
}

export interface SyncableJobFeed {
  source: string;
  sourceBoard: string;
  name: string;
  fetch: () => Promise<{ jobs: SearchJob[]; completeSnapshot: boolean; warning?: string }>;
}

interface ConfiguredBoardFeed {
  source: string;
  sourceBoard: string;
  name: string;
  attributionUrl: string;
  load: () => Promise<SearchJob[]>;
  fetchFresh: () => Promise<SearchJob[]>;
}

const DEFAULT_GREENHOUSE_BOARDS = [
  'stripe',
  'figma',
  'reddit',
  'coinbase',
  'cloudflare',
  'duolingo',
  'asana',
  'ramp',
];
const DEFAULT_ASHBY_BOARDS = ['openai', 'cursor', 'notion', 'perplexity'];

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

export interface CatalogueSearchResponse {
  jobs: SearchJob[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  lastSyncedAt: string | null;
  sources: Array<{
    name: string;
    source: string;
    sourceBoard: string;
    attributionUrl: string;
    availability: 'available' | 'stale' | 'pending' | 'unavailable';
    lastSuccessAt: string | null;
    error: string | null;
  }>;
  sourceErrors: Array<{ name: string; error: string }>;
}

interface CatalogueJobRow {
  id: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  workplaceType: string | null;
  employmentType: string | null;
  url: string;
  description: string | null;
  salary: string | null;
  tags: string[];
  visaSponsorshipLikely: boolean;
  postedAt: Date | null;
  source: string;
}

interface FeedSyncStatusRow {
  source: string;
  sourceBoard: string;
  lastAttemptAt: Date | null;
  lastSuccessAt: Date | null;
  lastError: string | null;
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

interface AshbyResponse {
  jobs?: Array<Record<string, unknown>>;
}

const MAX_ARBEITNOW_SYNC_PAGES = 5;

@Injectable()
export class JobSearchService {
  private readonly logger = new Logger(JobSearchService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<SearchJob[]>>();
  private remotiveLastRequestedAt = 0;

  constructor(
    private readonly jobTrackerService: JobTrackerService,
    private readonly prisma: PrismaService,
  ) {}

  async browseCatalogue(dto: BrowseJobListingsDto): Promise<CatalogueSearchResponse> {
    const queryTerms = dto.query?.trim().split(/\s+/).filter(Boolean) ?? [];
    const predicates: Prisma.Sql[] = [Prisma.sql`"isActive" = TRUE`];

    for (const term of queryTerms) {
      const pattern = `%${escapeLike(term)}%`;
      predicates.push(Prisma.sql`(
        "title" ILIKE ${pattern} OR "company" ILIKE ${pattern} OR
        COALESCE("location", '') ILIKE ${pattern} OR
        COALESCE("description", '') ILIKE ${pattern} OR
        array_to_string("tags", ' ') ILIKE ${pattern}
      )`);
    }

    const location = dto.location?.trim();
    if (location) {
      predicates.push(Prisma.sql`COALESCE("location", '') ILIKE ${`%${escapeLike(location)}%`}`);
    }
    if (dto.remoteOnly) predicates.push(Prisma.sql`"remote" = TRUE`);
    if (dto.visaSponsorshipOnly) predicates.push(visaSponsorshipMatchSql());
    if (dto.source) predicates.push(Prisma.sql`"source" = ${dto.source}`);

    const postedAfter = postedWithinDate(dto.postedWithin);
    if (postedAfter) predicates.push(Prisma.sql`"postedAt" >= ${postedAfter}`);

    const where = Prisma.sql`WHERE ${Prisma.join(predicates, ' AND ')}`;
    const offset = (dto.page - 1) * dto.pageSize;
    const order = buildCatalogueOrder(dto.sort, queryTerms);

    let rows: CatalogueJobRow[];
    let total: number;
    let feedStates: FeedSyncStatusRow[];
    try {
      const [jobRows, countRows, statuses] = await Promise.all([
        this.prisma.$queryRaw<CatalogueJobRow[]>(Prisma.sql`
          SELECT "id", "title", "company", "location", "remote", "workplaceType",
                 "employmentType", "url", "description", "salary", "tags", "postedAt", "source",
                 ${visaSponsorshipMatchSql()} AS "visaSponsorshipLikely"
          FROM "JobListing"
          ${where}
          ${order}
          LIMIT ${dto.pageSize} OFFSET ${offset}
        `),
        this.prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
          SELECT COUNT(*)::bigint AS total FROM "JobListing" ${where}
        `),
        this.prisma.jobFeedSyncState.findMany({
          select: { source: true, sourceBoard: true, lastAttemptAt: true, lastSuccessAt: true, lastError: true },
          orderBy: [{ source: 'asc' }, { sourceBoard: 'asc' }],
        }),
      ]);
      rows = jobRows;
      total = Number(countRows[0]?.total ?? 0n);
      feedStates = statuses;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('JobListing') || message.includes('JobFeedSyncState')) {
        throw new ServiceUnavailableException(
          'The job catalogue is not ready yet. Apply the catalogue migration and wait for its first sync.',
        );
      }
      throw error;
    }

    const sources = feedStates.map((state) => {
      const hasSuccess = Boolean(state.lastSuccessAt);
      const availability = state.lastError
        ? hasSuccess
          ? 'stale'
          : 'unavailable'
        : hasSuccess
          ? 'available'
          : 'pending';
      return {
        name: state.sourceBoard ? `${state.source} (${state.sourceBoard})` : state.source,
        source: state.source,
        sourceBoard: state.sourceBoard,
        attributionUrl: sourceAttributionUrl(state.source, state.sourceBoard),
        availability,
        lastSuccessAt: state.lastSuccessAt?.toISOString() ?? null,
        error: safeFeedError(state.lastError),
      } as const;
    });
    const successfulSyncs = feedStates.flatMap((state) =>
      state.lastSuccessAt ? [state.lastSuccessAt.getTime()] : [],
    );

    return {
      jobs: rows.map((job) => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location ?? 'Location not specified',
        remote: job.remote,
        workplaceType: job.workplaceType ?? undefined,
        employmentType: job.employmentType ?? undefined,
        url: job.url,
        description: job.description ?? '',
        salary: job.salary ?? undefined,
        tags: job.tags,
        visaSponsorshipLikely: job.visaSponsorshipLikely,
        postedAt: job.postedAt?.toISOString(),
        source: job.source,
      })),
      pagination: {
        page: dto.page,
        pageSize: dto.pageSize,
        total,
        totalPages: Math.ceil(total / dto.pageSize),
      },
      lastSyncedAt: successfulSyncs.length ? new Date(Math.max(...successfulSyncs)).toISOString() : null,
      sources,
      sourceErrors: sources
        .filter((source) => source.availability === 'stale' || source.availability === 'unavailable')
        .map(({ name, error }) => ({
          name,
          error: error ?? 'The public feed has not completed a successful sync yet.',
        })),
    };
  }

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

  getSyncableFeeds(): SyncableJobFeed[] {
    // Remotive stays request-only because its public API terms restrict third-party job-site republication.
    return [
      {
        source: 'Arbeitnow',
        sourceBoard: '',
        name: 'Arbeitnow',
        fetch: () => this.fetchArbeitnowSnapshot(),
      },
      {
        source: 'Remote OK',
        sourceBoard: '',
        name: 'Remote OK',
        fetch: () => this.fetchRemoteOkSnapshot(),
      },
      ...this.getConfiguredBoards(true).map((feed) => ({
        source: feed.source,
        sourceBoard: feed.sourceBoard,
        name: feed.name,
        fetch: async () => ({ jobs: await feed.fetchFresh(), completeSnapshot: true }),
      })),
    ];
  }

  private async fetchArbeitnowSnapshot(): Promise<{
    jobs: SearchJob[];
    completeSnapshot: boolean;
    warning?: string;
  }> {
    const jobs: SearchJob[] = [];
    const visitedPages = new Set<string>();
    let nextPage: string | null = 'https://www.arbeitnow.com/api/job-board-api?page=1';
    let completeSnapshot = false;
    let pageCount = 0;

    for (; pageCount < MAX_ARBEITNOW_SYNC_PAGES && nextPage; pageCount += 1) {
      if (visitedPages.has(nextPage)) throw new Error('Arbeitnow pagination repeated a page.');
      visitedPages.add(nextPage);

      if (pageCount > 0) await delay(1_000);
      let response: ArbeitnowResponse;
      try {
        response = await this.fetchJson<ArbeitnowResponse>(nextPage);
      } catch (error) {
        if (jobs.length === 0) throw error;
        return {
          jobs,
          completeSnapshot: false,
          warning: error instanceof Error ? error.message : 'Feed refresh was incomplete.',
        };
      }
      jobs.push(...(response.data ?? []).map((job) => this.normalizeArbeitnow(job)));

      if (!response.links?.next) {
        completeSnapshot = true;
        nextPage = null;
        continue;
      }

      const parsedNextPage = new URL(response.links.next, 'https://www.arbeitnow.com');
      if (
        parsedNextPage.protocol !== 'https:' ||
        !['arbeitnow.com', 'www.arbeitnow.com'].includes(parsedNextPage.hostname) ||
        parsedNextPage.pathname !== '/api/job-board-api'
      ) {
        throw new Error('Arbeitnow returned an invalid pagination URL.');
      }
      nextPage = parsedNextPage.href;
    }

    return { jobs, completeSnapshot };
  }

  private async fetchRemoteOkSnapshot(): Promise<{
    jobs: SearchJob[];
    completeSnapshot: boolean;
  }> {
    const response = await this.fetchJson<Array<Record<string, unknown>>>(
      'https://remoteok.com/api',
    );
    const jobs = response
      .filter((job) => stringValue(job.id) && stringValue(job.position) && stringValue(job.company))
      .map((job) => this.normalizeRemoteOk(job));
    return { jobs, completeSnapshot: true };
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

  private getConfiguredBoards(useDefaults = false): ConfiguredBoardFeed[] {
    const greenhouseBoards = this.readBoardSlugs(
      'JOB_SEARCH_GREENHOUSE_BOARDS',
      useDefaults ? DEFAULT_GREENHOUSE_BOARDS : [],
    );
    const leverBoards = this.readBoardSlugs('JOB_SEARCH_LEVER_BOARDS');
    const ashbyBoards = this.readBoardSlugs(
      'JOB_SEARCH_ASHBY_BOARDS',
      useDefaults ? DEFAULT_ASHBY_BOARDS : [],
    );
    return [
      ...greenhouseBoards.map((board) => ({
        source: 'Greenhouse',
        sourceBoard: board,
        name: `Greenhouse (${board})`,
        attributionUrl: `https://boards.greenhouse.io/${encodeURIComponent(board)}`,
        load: () =>
          this.getCached(`greenhouse:${board}`, 15 * 60 * 1000, () =>
            this.fetchGreenhouseBoard(board),
          ),
        fetchFresh: () => this.fetchGreenhouseBoard(board),
      })),
      ...leverBoards.map((board) => ({
        source: 'Lever',
        sourceBoard: board,
        name: `Lever (${board})`,
        attributionUrl: `https://jobs.lever.co/${encodeURIComponent(board)}`,
        load: () =>
          this.getCached(`lever:${board}`, 15 * 60 * 1000, () => this.fetchLeverBoard(board)),
        fetchFresh: () => this.fetchLeverBoard(board),
      })),
      ...ashbyBoards.map((board) => ({
        source: 'Ashby',
        sourceBoard: board,
        name: `Ashby (${board})`,
        attributionUrl: `https://jobs.ashbyhq.com/${encodeURIComponent(board)}`,
        load: () =>
          this.getCached(`ashby:${board}`, 15 * 60 * 1000, () => this.fetchAshbyBoard(board)),
        fetchFresh: () => this.fetchAshbyBoard(board),
      })),
    ];
  }

  private async fetchGreenhouseBoard(board: string): Promise<SearchJob[]> {
    const response = await this.fetchJson<{ jobs?: Array<Record<string, unknown>> }>(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`,
    );
    return (response.jobs ?? []).map((job) => this.normalizeGreenhouse(job, board));
  }

  private async fetchLeverBoard(board: string): Promise<SearchJob[]> {
    const response = await this.fetchJson<Array<Record<string, unknown>>>(
      `https://api.lever.co/v0/postings/${encodeURIComponent(board)}?mode=json`,
    );
    return response.map((job) => this.normalizeLever(job, board));
  }

  private async fetchAshbyBoard(board: string): Promise<SearchJob[]> {
    const response = await this.fetchJson<AshbyResponse>(
      `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}?includeCompensation=true`,
    );
    return (response.jobs ?? [])
      .filter((job) => job.isListed === true)
      .map((job) => this.normalizeAshby(job, board));
  }

  private readBoardSlugs(variable: string, defaults: string[] = []): string[] {
    const configured = (process.env[variable] ?? '')
      .split(',')
      .map((board) => board.trim())
      .filter((board) => /^[a-zA-Z0-9_-]{1,80}$/.test(board))
      .slice(0, 20);
    return configured.length ? configured : defaults;
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
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'JobIN job search' },
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) return (await response.json()) as T;

      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === 3) throw new Error(`Feed returned HTTP ${response.status}`);

      const retryAfter = response.headers.get('retry-after');
      const retryAfterSeconds = retryAfter ? Number(retryAfter) : NaN;
      const retryAfterDate = retryAfter && Number.isNaN(retryAfterSeconds)
        ? Date.parse(retryAfter) - Date.now()
        : NaN;
      const waitMs = Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : Number.isFinite(retryAfterDate)
          ? retryAfterDate
          : 1_000 * (2 ** attempt);
      await delay(Math.max(1_000, Math.min(waitMs, 120_000)));
    }
    throw new Error('Feed request retries were exhausted.');
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

  private normalizeRemoteOk(job: Record<string, unknown>): SearchJob {
    const location = stringValue(job.location) || 'Remote';
    const minimum = Number(job.salary_min);
    const maximum = Number(job.salary_max);
    const salary =
      Number.isFinite(minimum) && Number.isFinite(maximum) && (minimum > 0 || maximum > 0)
        ? [minimum, maximum].filter((amount) => amount > 0).join('–')
        : undefined;
    return {
      id: `remoteok:${stringValue(job.id)}`,
      title: stringValue(job.position) || 'Untitled role',
      company: stringValue(job.company) || 'Company not specified',
      location,
      remote: true,
      url: safeHttpUrl(job.url) || safeHttpUrl(job.apply_url),
      description: stripHtml(stringValue(job.description)),
      salary,
      postedAt: validDate(job.date),
      source: 'Remote OK',
      tags: toStringArray(job.tags),
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

  private normalizeAshby(job: Record<string, unknown>, board: string): SearchJob {
    const workplaceType = stringValue(job.workplaceType);
    const compensation = job.compensation as Record<string, unknown> | undefined;
    const tags = [
      stringValue(job.department),
      stringValue(job.team),
      stringValue(job.employmentType),
      workplaceType,
    ].filter(Boolean);
    return {
      id: `ashby:${board}:${stringValue(job.jobUrl) || stringValue(job.applyUrl)}`,
      title: stringValue(job.title) || 'Untitled role',
      company: board,
      location: stringValue(job.location) || 'Location not specified',
      remote:
        job.isRemote === true || /^(remote|hybrid)$/i.test(workplaceType),
      url: safeHttpUrl(job.jobUrl) || safeHttpUrl(job.applyUrl),
      description: stripHtml(stringValue(job.descriptionPlain) || stringValue(job.descriptionHtml)),
      salary: stringValue(compensation?.scrapeableCompensationSalarySummary) || undefined,
      postedAt: validDate(job.publishedAt),
      source: 'Ashby',
      tags,
      workplaceType: workplaceType || undefined,
      employmentType: stringValue(job.employmentType) || undefined,
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

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

const SPONSORSHIP_POSITIVE_PATTERNS = [
  '%visa sponsorship%',
  '%work visa sponsorship%',
  '%sponsorship available%',
  '%offer sponsorship%',
  '%provide sponsorship%',
  '%sponsor your visa%',
  '%sponsor a work visa%',
  '%will sponsor%',
  '%we sponsor%',
  '%can sponsor%',
];

const SPONSORSHIP_NEGATIVE_PATTERNS = [
  '%no sponsorship%',
  '%no visa sponsorship%',
  '%sponsorship not available%',
  '%not offering sponsorship%',
  '%not offer sponsorship%',
  '%not provide sponsorship%',
  '%not sponsor%',
  '%do not sponsor%',
  '%does not sponsor%',
  "%don't sponsor%",
  "%doesn't sponsor%",
  '%cannot sponsor%',
  "%can't sponsor%",
  '%unable to sponsor%',
  '%not able to sponsor%',
  '%will not sponsor%',
  '%without sponsorship%',
];

function visaSponsorshipMatchSql(): Prisma.Sql {
  const searchableText = Prisma.sql`CONCAT_WS(' ', COALESCE("title", ''), COALESCE("description", ''), array_to_string("tags", ' '))`;
  const matchesAny = (patterns: string[]) =>
    Prisma.sql`${searchableText} ILIKE ANY (ARRAY[${Prisma.join(patterns.map((pattern) => Prisma.sql`${pattern}`))}]::TEXT[])`;

  return Prisma.sql`(${matchesAny(SPONSORSHIP_POSITIVE_PATTERNS)} AND NOT ${matchesAny(SPONSORSHIP_NEGATIVE_PATTERNS)})`;
}

function postedWithinDate(value?: BrowseJobListingsDto['postedWithin']): Date | null {
  const ageMs = value === '24h' ? 24 * 60 * 60 * 1000 : value === '7d' ? 7 * 86400000 : value === '30d' ? 30 * 86400000 : 0;
  return ageMs ? new Date(Date.now() - ageMs) : null;
}

function buildCatalogueOrder(
  sort: BrowseJobListingsDto['sort'],
  queryTerms: string[],
): Prisma.Sql {
  if (sort !== 'relevance' || queryTerms.length === 0) {
    return Prisma.sql`ORDER BY "postedAt" DESC NULLS LAST, "createdAt" DESC`;
  }

  const scores = queryTerms.map((term) => {
    const escaped = escapeLike(term);
    return Prisma.sql`CASE
      WHEN "title" ILIKE ${`${escaped}%`} THEN 3
      WHEN "title" ILIKE ${`%${escaped}%`} THEN 2
      WHEN "company" ILIKE ${`%${escaped}%`} THEN 1
      ELSE 0
    END`;
  });
  return Prisma.sql`ORDER BY (${Prisma.join(scores, ' + ')}) DESC,
    "postedAt" DESC NULLS LAST, "createdAt" DESC`;
}

function sourceAttributionUrl(source: string, sourceBoard: string): string {
  const board = encodeURIComponent(sourceBoard);
  switch (source) {
    case 'Remote OK':
      return 'https://remoteok.com/';
    case 'Greenhouse':
      return `https://boards.greenhouse.io/${board}`;
    case 'Lever':
      return `https://jobs.lever.co/${board}`;
    case 'Ashby':
      return `https://jobs.ashbyhq.com/${board}`;
    default:
      return 'https://www.arbeitnow.com/';
  }
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function safeFeedError(error: string | null): string | null {
  if (!error) return null;
  if (error.startsWith('The public feed ')) return error;
  const status = error.match(/^Feed returned HTTP (\d{3})$/)?.[1];
  if (status) return `The public feed returned HTTP ${status}.`;
  if (error.includes('pagination repeated')) return 'The public feed returned a repeated page link.';
  if (error.includes('invalid pagination URL')) return 'The public feed returned an invalid page link.';
  if (error.includes('fetch failed') || error.includes('network') || error.includes('timeout')) {
    return 'The API could not connect to the public feed. It will retry automatically.';
  }
  return 'The public feed returned an invalid response. It will retry automatically.';
}
