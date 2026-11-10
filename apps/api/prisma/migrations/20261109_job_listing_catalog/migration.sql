CREATE TABLE "JobListing" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceBoard" TEXT NOT NULL DEFAULT '',
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "workplaceType" TEXT,
    "employmentType" TEXT,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "salary" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "postedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobListing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobListing_source_sourceBoard_externalId_key"
ON "JobListing"("source", "sourceBoard", "externalId");

CREATE INDEX "JobListing_isActive_postedAt_idx"
ON "JobListing"("isActive", "postedAt");

CREATE INDEX "JobListing_isActive_remote_postedAt_idx"
ON "JobListing"("isActive", "remote", "postedAt");

CREATE INDEX "JobListing_location_idx"
ON "JobListing"("location");

CREATE INDEX "JobListing_source_isActive_idx"
ON "JobListing"("source", "isActive");

CREATE TABLE "JobFeedSyncState" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceBoard" TEXT NOT NULL DEFAULT '',
    "lastAttemptAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "nextSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "lastJobCount" INTEGER NOT NULL DEFAULT 0,
    "lockToken" TEXT,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobFeedSyncState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobFeedSyncState_source_sourceBoard_key"
ON "JobFeedSyncState"("source", "sourceBoard");

CREATE INDEX "JobFeedSyncState_nextSyncAt_idx"
ON "JobFeedSyncState"("nextSyncAt");

CREATE INDEX "JobFeedSyncState_lastSuccessAt_idx"
ON "JobFeedSyncState"("lastSuccessAt");
