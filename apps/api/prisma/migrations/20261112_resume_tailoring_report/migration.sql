ALTER TABLE "ResumeVersion"
  ADD COLUMN "tailoringReport" JSONB,
  ADD COLUMN "designTemplate" TEXT NOT NULL DEFAULT 'modern',
  ADD COLUMN "pageSize" TEXT NOT NULL DEFAULT 'A4';
