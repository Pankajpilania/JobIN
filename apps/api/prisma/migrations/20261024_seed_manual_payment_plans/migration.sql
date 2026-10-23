INSERT INTO "Plan" (
    "id",
    "name",
    "stripePriceId",
    "priceMonthly",
    "priceYearly",
    "currency",
    "isActive",
    "createdAt",
    "updatedAt"
)
VALUES
    (gen_random_uuid()::text, 'PREMIUM', 'price_premium_monthly_placeholder', 15, 144, 'GBP', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'PRO', 'price_pro_monthly_placeholder', 29, 276, 'GBP', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "PlanFeature" ("id", "planId", "featureKey", "value")
SELECT gen_random_uuid()::text, plan."id", feature."featureKey", feature."value"
FROM (
    VALUES
        ('PREMIUM', 'ai_credits_monthly', '100'),
        ('PREMIUM', 'resume_uploads', '10'),
        ('PREMIUM', 'tracker_entries', '200'),
        ('PRO', 'ai_credits_monthly', '500'),
        ('PRO', 'resume_uploads', '50'),
        ('PRO', 'tracker_entries', '-1')
) AS feature("planName", "featureKey", "value")
JOIN "Plan" plan ON plan."name" = feature."planName"
WHERE NOT EXISTS (
    SELECT 1
    FROM "PlanFeature" existing
    WHERE existing."planId" = plan."id"
      AND existing."featureKey" = feature."featureKey"
);
