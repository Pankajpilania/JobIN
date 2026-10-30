DELETE FROM "AuditLog"
WHERE "targetEntity" IN ('ManualPaymentSettings', 'ManualPaymentMethod');

DELETE FROM "ManualPaymentRequest";

DELETE FROM "Payment"
WHERE "stripeIntentId" LIKE 'manual-%';

DELETE FROM "Invoice"
WHERE "subscriptionId" IN (
    SELECT "id"
    FROM "Subscription"
    WHERE "stripeSubscriptionId" LIKE 'manual-%'
);

DELETE FROM "Subscription"
WHERE "stripeSubscriptionId" LIKE 'manual-%';

DROP TABLE "ManualPaymentMethod";
DROP TABLE "ManualPaymentSettings";
DROP TABLE "ManualPaymentRequest";
