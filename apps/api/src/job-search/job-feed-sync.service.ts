import { randomUUID } from 'node:crypto';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JobSearchService, type SearchJob, type SyncableJobFeed } from './job-search.service';

const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;
const FAILURE_RETRY_MS = 30 * 60 * 1000;
const LOCK_LEASE_MS = 30 * 60 * 1000;
const MAX_PARALLEL_FEEDS = 4;
const UPSERT_BATCH_SIZE = 100;

@Injectable()
export class JobFeedSyncService implements OnModuleInit {
  private readonly logger = new Logger(JobFeedSyncService.name);
  private catalogReady = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobSearchService: JobSearchService,
  ) {}

  onModuleInit() {
    void this.syncDueFeeds();
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncOnSchedule() {
    await this.syncDueFeeds();
  }

  private async syncDueFeeds() {
    if (!this.catalogReady) {
      try {
        const tables = await this.prisma.$queryRaw<
          Array<{ listings: string | null; syncState: string | null }>
        >`SELECT to_regclass('public."JobListing"')::text AS listings,
                 to_regclass('public."JobFeedSyncState"')::text AS "syncState"`;
        this.catalogReady = Boolean(tables[0]?.listings && tables[0]?.syncState);
        if (!this.catalogReady) {
          this.logger.warn('Job feed sync is waiting for the job catalogue migration.');
          return;
        }
      } catch (error) {
        this.logger.warn(
          `Job feed sync could not check catalogue tables: ${error instanceof Error ? error.message : 'Unknown database error'}`,
        );
        return;
      }
    }

    const feeds = this.jobSearchService.getSyncableFeeds();
    for (let index = 0; index < feeds.length; index += MAX_PARALLEL_FEEDS) {
      const batch = feeds.slice(index, index + MAX_PARALLEL_FEEDS);
      await Promise.all(batch.map((feed) => this.syncFeed(feed)));
    }
  }

  private async syncFeed(feed: SyncableJobFeed) {
    let lockToken: string | null = null;
    try {
      lockToken = await this.claimFeed(feed);
      if (!lockToken) return;

      const fetchedAt = new Date();
      const snapshot = await feed.fetch();
      const jobsWithUrls = snapshot.jobs.filter((job) => job.url);
      const validJobs = deduplicateJobs(jobsWithUrls);
      const isComplete = snapshot.completeSnapshot && jobsWithUrls.length === snapshot.jobs.length;

      await this.persistSnapshot(feed, validJobs, fetchedAt, isComplete, lockToken);
      this.logger.log(`${feed.name}: synced ${validJobs.length} public job listings.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown feed sync error';
      this.logger.warn(`${feed.name}: job feed sync failed: ${message}`);
      if (lockToken) await this.recordFailure(feed, lockToken, message);
    }
  }

  private async claimFeed(feed: SyncableJobFeed): Promise<string | null> {
    await this.prisma.jobFeedSyncState.createMany({
      data: [{ source: feed.source, sourceBoard: feed.sourceBoard }],
      skipDuplicates: true,
    });

    const now = new Date();
    const lockToken = randomUUID();
    const claimed = await this.prisma.jobFeedSyncState.updateMany({
      where: {
        source: feed.source,
        sourceBoard: feed.sourceBoard,
        AND: [
          { OR: [{ nextSyncAt: null }, { nextSyncAt: { lte: now } }] },
          { OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }] },
        ],
      },
      data: {
        lockToken,
        lockedUntil: new Date(now.getTime() + LOCK_LEASE_MS),
        lastAttemptAt: now,
      },
    });
    return claimed.count === 1 ? lockToken : null;
  }

  private async persistSnapshot(
    feed: SyncableJobFeed,
    jobs: SearchJob[],
    syncedAt: Date,
    completeSnapshot: boolean,
    lockToken: string,
  ) {
    const records = jobs.map((job) => ({
      id: randomUUID(),
      source: feed.source,
      sourceBoard: feed.sourceBoard,
      externalId: job.id,
      job,
    }));

    await this.prisma.$transaction(
      async (transaction) => {
        for (let index = 0; index < records.length; index += UPSERT_BATCH_SIZE) {
          const batch = records.slice(index, index + UPSERT_BATCH_SIZE);
          const rows = batch.map(({ id, source, sourceBoard, externalId, job }) =>
            listingValues(id, source, sourceBoard, externalId, job, syncedAt),
          );
          await transaction.$executeRaw(Prisma.sql`
            INSERT INTO "JobListing" (
              "id", "source", "sourceBoard", "externalId", "title", "company", "location",
              "remote", "workplaceType", "employmentType", "url", "description", "salary",
              "tags", "postedAt", "isActive", "firstSeenAt", "lastSeenAt", "closedAt",
              "createdAt", "updatedAt"
            ) VALUES ${Prisma.join(rows)}
            ON CONFLICT ("source", "sourceBoard", "externalId") DO UPDATE SET
              "title" = EXCLUDED."title",
              "company" = EXCLUDED."company",
              "location" = EXCLUDED."location",
              "remote" = EXCLUDED."remote",
              "workplaceType" = EXCLUDED."workplaceType",
              "employmentType" = EXCLUDED."employmentType",
              "url" = EXCLUDED."url",
              "description" = EXCLUDED."description",
              "salary" = EXCLUDED."salary",
              "tags" = EXCLUDED."tags",
              "postedAt" = EXCLUDED."postedAt",
              "isActive" = true,
              "lastSeenAt" = EXCLUDED."lastSeenAt",
              "closedAt" = NULL,
              "updatedAt" = EXCLUDED."updatedAt"
          `);
        }

        if (completeSnapshot) {
          await transaction.jobListing.updateMany({
            where: {
              source: feed.source,
              sourceBoard: feed.sourceBoard,
              isActive: true,
              lastSeenAt: { lt: syncedAt },
            },
            data: { isActive: false, closedAt: syncedAt, updatedAt: syncedAt },
          });
        }

        await transaction.jobFeedSyncState.updateMany({
          where: {
            source: feed.source,
            sourceBoard: feed.sourceBoard,
            lockToken,
          },
          data: {
            lastSuccessAt: syncedAt,
            nextSyncAt: new Date(syncedAt.getTime() + SYNC_INTERVAL_MS),
            lastError: null,
            lastJobCount: records.length,
            lockToken: null,
            lockedUntil: null,
          },
        });
      },
      { maxWait: 10_000, timeout: 120_000 },
    );
  }

  private async recordFailure(feed: SyncableJobFeed, lockToken: string, message: string) {
    try {
      const now = new Date();
      await this.prisma.jobFeedSyncState.updateMany({
        where: {
          source: feed.source,
          sourceBoard: feed.sourceBoard,
          lockToken,
        },
        data: {
          lastError: message.slice(0, 2_000),
          nextSyncAt: new Date(now.getTime() + FAILURE_RETRY_MS),
          lockToken: null,
          lockedUntil: null,
        },
      });
    } catch (error) {
      this.logger.error(
        `${feed.name}: could not record sync failure: ${error instanceof Error ? error.message : 'Unknown database error'}`,
      );
    }
  }
}

function deduplicateJobs(jobs: SearchJob[]): SearchJob[] {
  const unique = new Map<string, SearchJob>();
  for (const job of jobs) unique.set(job.id, job);
  return [...unique.values()];
}

function listingValues(
  id: string,
  source: string,
  sourceBoard: string,
  externalId: string,
  job: SearchJob,
  syncedAt: Date,
) {
  const tags = job.tags.length
    ? Prisma.sql`ARRAY[${Prisma.join(job.tags.map((tag) => Prisma.sql`${tag}`))}]::TEXT[]`
    : Prisma.sql`ARRAY[]::TEXT[]`;
  const postedAt = job.postedAt ? new Date(job.postedAt) : null;

  return Prisma.sql`(
    ${id}, ${source}, ${sourceBoard}, ${externalId}, ${job.title}, ${job.company},
    ${job.location || null}, ${job.remote}, ${job.workplaceType ?? null},
    ${job.employmentType ?? null}, ${job.url}, ${job.description || null},
    ${job.salary ?? null}, ${tags}, ${postedAt}, true, ${syncedAt}, ${syncedAt},
    NULL, ${syncedAt}, ${syncedAt}
  )`;
}
