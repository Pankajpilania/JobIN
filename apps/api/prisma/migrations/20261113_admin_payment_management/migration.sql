ALTER TABLE "Payment"
ADD COLUMN "stripeInvoiceId" TEXT,
ADD COLUMN "amountRefunded" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "failureMessage" TEXT;

CREATE UNIQUE INDEX "Payment_stripeInvoiceId_key" ON "Payment"("stripeInvoiceId");
