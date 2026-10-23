UPDATE "PlanFeature" AS feature
SET "value" = limits."creditLimit"
FROM "Plan" AS plan
JOIN (
    VALUES
        ('FREE', '20'),
        ('PREMIUM', '100'),
        ('PRO', '500')
) AS limits("planName", "creditLimit")
    ON plan."name" = limits."planName"
WHERE feature."planId" = plan."id"
  AND feature."featureKey" = 'ai_credits_monthly';

INSERT INTO "PlanFeature" ("id", "planId", "featureKey", "value")
SELECT gen_random_uuid()::text, plan."id", 'ai_credits_monthly', limits."creditLimit"
FROM "Plan" AS plan
JOIN (
    VALUES
        ('FREE', '20'),
        ('PREMIUM', '100'),
        ('PRO', '500')
) AS limits("planName", "creditLimit")
    ON plan."name" = limits."planName"
WHERE NOT EXISTS (
    SELECT 1
    FROM "PlanFeature" AS feature
    WHERE feature."planId" = plan."id"
      AND feature."featureKey" = 'ai_credits_monthly'
);
