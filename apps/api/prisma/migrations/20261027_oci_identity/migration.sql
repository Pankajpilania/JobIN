ALTER TABLE "User"
ADD COLUMN "ociSub" TEXT;

CREATE UNIQUE INDEX "User_ociSub_key" ON "User"("ociSub");

CREATE INDEX "User_ociSub_idx" ON "User"("ociSub");
