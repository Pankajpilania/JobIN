INSERT INTO "Role" ("id", "name", "description", "createdAt")
VALUES
    (gen_random_uuid()::text, 'CANDIDATE', 'Standard job-seeker account', CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'RECRUITER', 'Hiring-side recruiter account', CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'SUPER_ADMIN', 'Full platform access', CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'OPERATIONS_ADMIN', 'Ops and user management', CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'SUPPORT_ADMIN', 'Support ticket handling', CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'FINANCE_ADMIN', 'Billing and revenue reporting', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "Permission" ("id", "action", "description", "createdAt")
VALUES
    (gen_random_uuid()::text, 'users:read', 'Read user profiles', CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'users:write', 'Create or update users', CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'users:delete', 'Soft-delete users', CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'users:suspend', 'Suspend user accounts', CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'billing:read', 'View billing and subscriptions', CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'billing:write', 'Manage billing plans', CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'ai:use', 'Use AI features', CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'ai:bypass_limits', 'Bypass AI rate limits', CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'admin:access', 'Access the admin portal', CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'support:read_tickets', 'Read support tickets', CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'support:write_tickets', 'Respond to support tickets', CURRENT_TIMESTAMP)
ON CONFLICT ("action") DO NOTHING;

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
VALUES (
    gen_random_uuid()::text,
    'FREE',
    'price_free_placeholder',
    0,
    0,
    'GBP',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "PlanFeature" ("id", "planId", "featureKey", "value")
SELECT gen_random_uuid()::text, plan."id", feature."featureKey", feature."value"
FROM "Plan" AS plan
CROSS JOIN (
    VALUES
        ('ai_credits_monthly', '20'),
        ('resume_uploads', '2'),
        ('tracker_entries', '25')
) AS feature("featureKey", "value")
WHERE plan."name" = 'FREE'
  AND NOT EXISTS (
      SELECT 1
      FROM "PlanFeature" AS existing
      WHERE existing."planId" = plan."id"
        AND existing."featureKey" = feature."featureKey"
  );
