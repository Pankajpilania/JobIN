import { PrismaService } from '../prisma/prisma.service';
import { JobFeedSyncService } from './job-feed-sync.service';
import { JobSearchService, type SearchJob, type SyncableJobFeed } from './job-search.service';

describe('JobFeedSyncService', () => {
  const job: SearchJob = {
    id: 'ashby:acme:role-1',
    title: 'Product Designer',
    company: 'Acme',
    location: 'Remote',
    remote: true,
    url: 'https://jobs.ashbyhq.com/acme/role-1',
    description: 'Design products',
    postedAt: '2026-11-08T12:00:00.000Z',
    source: 'Ashby',
    tags: ['Design'],
  };

  function makeService(snapshot: () => Promise<{ jobs: SearchJob[]; completeSnapshot: boolean }>) {
    const feed: SyncableJobFeed = {
      source: 'Ashby',
      sourceBoard: 'acme',
      name: 'Ashby (acme)',
      fetch: snapshot,
    };
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      jobListing: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      jobFeedSyncState: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ listings: 'JobListing', syncState: 'JobFeedSyncState' }]),
      $transaction: jest.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
      jobFeedSyncState: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const jobSearchService = { getSyncableFeeds: () => [feed] };
    const service = new JobFeedSyncService(
      prisma as unknown as PrismaService,
      jobSearchService as unknown as JobSearchService,
    );
    return { service, prisma, transaction };
  }

  it('upserts a complete feed snapshot and closes listings that disappeared', async () => {
    const { service, transaction } = makeService(async () => ({ jobs: [job], completeSnapshot: true }));

    await service['syncDueFeeds']();

    expect(transaction.$executeRaw).toHaveBeenCalledTimes(1);
    expect(transaction.$executeRaw.mock.calls[0][0]).toEqual(
      expect.objectContaining({ sql: expect.stringContaining('ON CONFLICT') }),
    );
    expect(transaction.jobListing.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ source: 'Ashby', sourceBoard: 'acme', isActive: true }),
        data: expect.objectContaining({ isActive: false }),
      }),
    );
    expect(transaction.jobFeedSyncState.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ lastJobCount: 1, lastError: null }) }),
    );
  });

  it('does not close unseen listings for an incomplete snapshot', async () => {
    const { service, transaction } = makeService(async () => ({ jobs: [job], completeSnapshot: false }));

    await service['syncDueFeeds']();

    expect(transaction.$executeRaw).toHaveBeenCalledTimes(1);
    expect(transaction.jobListing.updateMany).not.toHaveBeenCalled();
  });

  it('records a failed feed and leaves its listings open for retry', async () => {
    const { service, prisma, transaction } = makeService(async () => {
      throw new Error('provider unavailable');
    });

    await service['syncDueFeeds']();

    expect(transaction.$executeRaw).not.toHaveBeenCalled();
    expect(transaction.jobListing.updateMany).not.toHaveBeenCalled();
    expect(prisma.jobFeedSyncState.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ lockToken: expect.any(String) }),
        data: expect.objectContaining({
          lastError: 'The public feed returned an invalid response. It will retry automatically.',
          nextSyncAt: expect.any(Date),
        }),
      }),
    );
  });

  it('saves partial results after a rate limit and schedules a shorter retry', async () => {
    const { service, transaction } = makeService(async () => ({
      jobs: [job],
      completeSnapshot: false,
      warning: 'Feed returned HTTP 429',
    }));

    await service['syncDueFeeds']();

    expect(transaction.$executeRaw).toHaveBeenCalledTimes(1);
    expect(transaction.jobListing.updateMany).not.toHaveBeenCalled();
    expect(transaction.jobFeedSyncState.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lastSuccessAt: expect.any(Date),
          lastError: 'The public feed returned HTTP 429.',
          nextSyncAt: expect.any(Date),
          lastJobCount: 1,
        }),
      }),
    );
  });
});
