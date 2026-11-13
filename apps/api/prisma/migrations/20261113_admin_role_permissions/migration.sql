-- Fine-grained permissions used by the admin role editor. Existing role and
-- junction tables are part of the base schema; this migration only adds data.
INSERT INTO "Permission" ("id", "action", "description", "createdAt")
VALUES
  (gen_random_uuid()::text, 'admin:access', 'Access the admin portal', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'users:read', 'Read user profiles', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'billing:read', 'View billing and subscriptions', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'billing:write', 'Manage billing plans', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'support:read_tickets', 'Read support tickets', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'support:write_tickets', 'Respond to support tickets', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'reports:dashboard', 'View admin dashboard metrics', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'users:manage_status', 'Verify or suspend user accounts', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'users:manage_billing', 'Manage user plans and credits', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'discounts:manage', 'Manage discount codes', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'payments:refund', 'Issue payment refunds', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'ai:read', 'View AI usage and cost reports', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'notifications:send', 'Send user notifications', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'content:manage', 'Manage public site banners', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'reports:users', 'Export user report', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'reports:billing', 'Export billing report', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'reports:subscriptions', 'Export subscription report', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'reports:ai', 'Export AI usage report', CURRENT_TIMESTAMP)
ON CONFLICT ("action") DO NOTHING;

WITH grants(role_name, action) AS (
  VALUES
    ('OPERATIONS_ADMIN', 'admin:access'), ('OPERATIONS_ADMIN', 'reports:dashboard'),
    ('OPERATIONS_ADMIN', 'users:read'), ('OPERATIONS_ADMIN', 'users:manage_status'),
    ('OPERATIONS_ADMIN', 'ai:read'), ('OPERATIONS_ADMIN', 'support:read_tickets'),
    ('OPERATIONS_ADMIN', 'support:write_tickets'), ('OPERATIONS_ADMIN', 'notifications:send'),
    ('OPERATIONS_ADMIN', 'content:manage'), ('OPERATIONS_ADMIN', 'reports:ai'),
    ('SUPPORT_ADMIN', 'admin:access'), ('SUPPORT_ADMIN', 'users:read'),
    ('SUPPORT_ADMIN', 'users:manage_status'), ('SUPPORT_ADMIN', 'support:read_tickets'),
    ('SUPPORT_ADMIN', 'support:write_tickets'),
    ('FINANCE_ADMIN', 'admin:access'), ('FINANCE_ADMIN', 'reports:dashboard'),
    ('FINANCE_ADMIN', 'users:read'), ('FINANCE_ADMIN', 'users:manage_billing'),
    ('FINANCE_ADMIN', 'billing:read'), ('FINANCE_ADMIN', 'billing:write'),
    ('FINANCE_ADMIN', 'discounts:manage'), ('FINANCE_ADMIN', 'payments:refund'),
    ('FINANCE_ADMIN', 'ai:read'), ('FINANCE_ADMIN', 'reports:billing'),
    ('FINANCE_ADMIN', 'reports:subscriptions'), ('FINANCE_ADMIN', 'reports:ai')
)
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM grants g
JOIN "Role" r ON r."name" = g.role_name
JOIN "Permission" p ON p."action" = g.action
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
