import { ServiceUnavailableException } from '@nestjs/common';
import { JobTrackerService } from '../job-tracker/job-tracker.service';
import { PrismaService } from '../prisma/prisma.service';
import { BrowseJobListingsDto } from './dto/browse-job-listings.dto';
import { JobSearchService } from './job-search.service';
import { SearchJobsDto } from './dto/search-jobs.dto';

describe('JobSearchService', () => {
  const tracker = {
    importSearchResults: jest.fn().mockImplementation(async (_userId, jobs) => ({
      imported: jobs.length,
      skipped: 0,
    })),
  };

  beforeEach(() => {
    tracker.importSearchResults.mockClear();
    delete process.env.JOB_SEARCH_GREENHOUSE_BOARDS;
    delete process.env.JOB_SEARCH_LEVER_BOARDS;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('filters the catalogue by sponsorship wording and returns the sponsorship signal', async () => {
    const row = {
      id: 'listing-1',
      title: 'Software Engineer',
      company: 'Acme',
      location: 'London',
      remote: false,
      workplaceType: null,
      employmentType: null,
      url: 'https://jobs.example/1',
      description: 'We offer visa sponsorship for this role.',
      salary: null,
      tags: [],
      visaSponsorshipLikely: true,
      postedAt: new Date('2026-11-08T12:00:00.000Z'),
      source: 'Greenhouse',
    };
    const queryRaw = jest.fn((query: { sql: string }) =>
      Promise.resolve(query.sql.includes('COUNT(*)') ? [{ total: 1n }] : [row]),
    );
    const prisma = {
      $queryRaw: queryRaw,
      jobFeedSyncState: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new JobSearchService(
      tracker as unknown as JobTrackerService,
      prisma as unknown as PrismaService,
    );

    const result = await service.browseCatalogue(
      Object.assign(new BrowseJobListingsDto(), { visaSponsorshipOnly: true }),
    );

    const statements = queryRaw.mock.calls.map(([query]) => query.sql);
    expect(statements.every((sql) => sql.includes('ILIKE ANY'))).toBe(true);
    expect(statements.every((sql) => sql.includes('AND NOT'))).toBe(true);
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].visaSponsorshipLikely).toBe(true);
    expect(result.jobs[0].description).toContain('visa sponsorship');
  });

  it('filters results, deduplicates links, applies the cap, and imports matches', async () => {
    const arbeitnowJobs = Array.from({ length: 15 }, (_, index) => ({
      slug: `arbeit-${index}`,
      title: 'Senior Software Engineer',
      company_name: `Company ${index}`,
      location: 'Remote Worldwide',
      remote: true,
      url:
        index === 0
          ? 'https://jobs.example/shared?utm_source=arbeitnow'
          : `https://jobs.example/a-${index}`,
      description: 'Build cloud applications',
      tags: ['engineering'],
      created_at: 1767312000,
    }));
    const remotiveJobs = Array.from({ length: 20 }, (_, index) => ({
      id: index,
      title: 'Software Engineer',
      company_name: `Remote Company ${index}`,
      candidate_required_location: 'Worldwide',
      url: index === 0 ? 'https://jobs.example/shared' : `https://jobs.example/r-${index}`,
      description: 'Remote work on software systems',
      publication_date: '2026-01-03T00:00:00.000Z',
    }));
    jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('arbeitnow.com')) {
        return new Response(JSON.stringify({ data: url.endsWith('page=1') ? arbeitnowJobs : [] }));
      }
      return new Response(JSON.stringify({ jobs: remotiveJobs }));
    });
    const service = new JobSearchService(tracker as unknown as JobTrackerService);

    const result = await service.search(
      'user-1',
      Object.assign(new SearchJobsDto(), {
        query: 'software engineer',
        location: 'worldwide',
        remoteOnly: true,
        limit: 25,
        autoImport: true,
      }),
    );

    expect(result.jobs).toHaveLength(25);
    expect(result.jobs.every((job) => job.remote)).toBe(true);
    expect(result.jobs.every((job) => job.title.toLowerCase().includes('software engineer'))).toBe(
      true,
    );
    expect(result.jobs.find((job) => job.source === 'Arbeitnow')?.postedAt).toBe(
      '2026-01-02T00:00:00.000Z',
    );
    expect(new Set(result.jobs.map((job) => job.url)).size).toBe(25);
    expect(result.importSummary).toEqual({ imported: 25, skipped: 0 });
    expect(tracker.importSearchResults).toHaveBeenCalledWith(
      'user-1',
      expect.arrayContaining([expect.objectContaining({ source: expect.any(String) })]),
    );
  });

  it('returns available results and names a feed that failed', async () => {
    const service = new JobSearchService(tracker as unknown as JobTrackerService);
    jest.spyOn(service as any, 'fetchJson').mockImplementation((url: string) => {
      if (url.includes('arbeitnow.com')) return Promise.reject(new Error('Feed returned HTTP 503'));
      return Promise.resolve({
          jobs: [
            {
              id: 1,
              title: 'Designer',
              company_name: 'Remote Co',
              url: 'https://jobs.example/designer',
              candidate_required_location: 'Remote',
              description: 'Design products',
            },
          ],
        });
    });

    const result = await service.search(
      'user-1',
      Object.assign(new SearchJobsDto(), { autoImport: false }),
    );

    expect(result.jobs).toHaveLength(1);
    expect(result.sourceErrors).toEqual([
      { name: 'Arbeitnow', error: 'This source is temporarily unavailable.' },
    ]);
    expect(tracker.importSearchResults).not.toHaveBeenCalled();
  });

  it('keeps successfully fetched Arbeitnow pages when a later page is rate limited', async () => {
    const service = new JobSearchService(tracker as unknown as JobTrackerService);
    jest
      .spyOn(service as any, 'fetchJson')
      .mockResolvedValueOnce({
        data: [
          {
            slug: 'role-1',
            title: 'Engineer',
            company_name: 'Example Co',
            url: 'https://jobs.example/role-1',
            created_at: 1767312000,
          },
        ],
        links: { next: 'https://www.arbeitnow.com/api/job-board-api?page=2' },
      })
      .mockRejectedValueOnce(new Error('Feed returned HTTP 429'));

    const result = await service['fetchArbeitnowSnapshot']();

    expect(result.jobs).toHaveLength(1);
    expect(result.completeSnapshot).toBe(false);
    expect(result.warning).toBe('Feed returned HTTP 429');
  });

  it('fails explicitly when every configured source is unavailable', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network unavailable'));
    const service = new JobSearchService(tracker as unknown as JobTrackerService);

    await expect(
      service.search('user-1', Object.assign(new SearchJobsDto(), { autoImport: false })),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
