CREATE TABLE "SiteBanner" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "linkText" TEXT,
    "linkUrl" TEXT,
    "variant" TEXT NOT NULL DEFAULT 'INFO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteBanner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SiteBanner_isActive_startsAt_endsAt_idx"
ON "SiteBanner"("isActive", "startsAt", "endsAt");

CREATE INDEX "SiteBanner_updatedAt_idx" ON "SiteBanner"("updatedAt");
