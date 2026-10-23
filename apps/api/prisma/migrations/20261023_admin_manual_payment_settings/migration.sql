CREATE TABLE "ManualPaymentSettings" (
    "currency" TEXT NOT NULL,
    "methodLabel" TEXT NOT NULL,
    "paymentDetails" TEXT NOT NULL DEFAULT '',
    "qrUrl" TEXT NOT NULL DEFAULT '',
    "premiumAmount" DOUBLE PRECISION NOT NULL,
    "proAmount" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualPaymentSettings_pkey" PRIMARY KEY ("currency")
);
