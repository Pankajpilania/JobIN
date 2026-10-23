ALTER TABLE "AIUsage"
ADD COLUMN "creditUnits" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "ManualPaymentRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "transactionReference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "ManualPaymentRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManualPaymentRequest_status_createdAt_idx"
ON "ManualPaymentRequest"("status", "createdAt");

CREATE INDEX "ManualPaymentRequest_userId_createdAt_idx"
ON "ManualPaymentRequest"("userId", "createdAt");

ALTER TABLE "ManualPaymentRequest"
ADD CONSTRAINT "ManualPaymentRequest_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ManualPaymentRequest"
ADD CONSTRAINT "ManualPaymentRequest_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
