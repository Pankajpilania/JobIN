ALTER TABLE "Subscription"
    ALTER COLUMN "currentPeriodEnd" DROP NOT NULL,
    ADD COLUMN "isComplimentary" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ManualPaymentRequest"
    ADD COLUMN "paymentMethodLabel" TEXT;

CREATE TABLE "ManualPaymentMethod" (
    "id" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "paymentDetails" TEXT NOT NULL DEFAULT '',
    "qrUrl" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ManualPaymentMethod_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManualPaymentMethod_currency_enabled_idx"
    ON "ManualPaymentMethod"("currency", "enabled");

INSERT INTO "ManualPaymentMethod" (
    "id", "currency", "label", "paymentDetails", "qrUrl", "enabled", "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    settings."currency",
    settings."methodLabel",
    settings."paymentDetails",
    settings."qrUrl",
    true,
    CURRENT_TIMESTAMP
FROM "ManualPaymentSettings" settings;

INSERT INTO "ManualPaymentMethod" (
    "id", "currency", "label", "paymentDetails", "qrUrl", "enabled", "updatedAt"
)
SELECT gen_random_uuid()::text, defaults."currency", defaults."label", '', defaults."qrUrl", true, CURRENT_TIMESTAMP
FROM (
    VALUES
        ('INR', 'UPI', '/payments/inr-payment.jpeg'),
        ('GBP', 'Bank transfer', '/payments/gbp-payment.jpeg')
) AS defaults("currency", "label", "qrUrl")
WHERE NOT EXISTS (
    SELECT 1 FROM "ManualPaymentMethod" existing
    WHERE existing."currency" = defaults."currency"
);

CREATE TABLE "StripePriceConfig" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StripePriceConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StripePriceConfig_stripePriceId_key"
    ON "StripePriceConfig"("stripePriceId");
CREATE UNIQUE INDEX "StripePriceConfig_planId_currency_interval_key"
    ON "StripePriceConfig"("planId", "currency", "interval");
CREATE INDEX "StripePriceConfig_planId_idx"
    ON "StripePriceConfig"("planId");
ALTER TABLE "StripePriceConfig"
    ADD CONSTRAINT "StripePriceConfig_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AIPlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "activeProvider" TEXT NOT NULL,
    "activeModel" TEXT NOT NULL,
    "baseUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AIPlatformSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AIProviderCredential" (
    "provider" TEXT NOT NULL,
    "encryptedApiKey" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AIProviderCredential_pkey" PRIMARY KEY ("provider")
);
