import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Sprint 1 reference data...');

  // ─── Roles ─────────────────────────────────────────────────────────────────
  const roles = [
    { name: 'CANDIDATE', description: 'Standard job-seeker account' },
    { name: 'RECRUITER', description: 'Hiring-side recruiter account' },
    { name: 'SUPER_ADMIN', description: 'Full platform access' },
    { name: 'OPERATIONS_ADMIN', description: 'Ops and user management' },
    { name: 'SUPPORT_ADMIN', description: 'Support ticket handling' },
    { name: 'FINANCE_ADMIN', description: 'Billing and revenue reporting' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description },
    });
  }
  console.log(`  ✅ ${roles.length} roles seeded`);

  // ─── Permissions ────────────────────────────────────────────────────────────
  const permissions = [
    { action: 'users:read', description: 'Read user profiles' },
    { action: 'users:write', description: 'Create or update users' },
    { action: 'users:delete', description: 'Soft-delete users' },
    { action: 'users:suspend', description: 'Suspend user accounts' },
    { action: 'billing:read', description: 'View billing and subscriptions' },
    { action: 'billing:write', description: 'Manage billing plans' },
    { action: 'ai:use', description: 'Use AI features' },
    { action: 'ai:bypass_limits', description: 'Bypass AI rate limits' },
    { action: 'admin:access', description: 'Access the admin portal' },
    { action: 'support:read_tickets', description: 'Read support tickets' },
    { action: 'support:write_tickets', description: 'Respond to support tickets' },
    { action: 'reports:dashboard', description: 'View admin dashboard metrics' },
    { action: 'users:manage_status', description: 'Verify or suspend user accounts' },
    { action: 'users:manage_billing', description: 'Manage user plans and credits' },
    { action: 'discounts:manage', description: 'Manage discount codes' },
    { action: 'payments:refund', description: 'Issue payment refunds' },
    { action: 'ai:read', description: 'View AI usage and cost reports' },
    { action: 'notifications:send', description: 'Send user notifications' },
    { action: 'content:manage', description: 'Manage public site banners' },
    { action: 'reports:users', description: 'Export user report' },
    { action: 'reports:billing', description: 'Export billing report' },
    { action: 'reports:subscriptions', description: 'Export subscription report' },
    { action: 'reports:ai', description: 'Export AI usage report' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { action: perm.action },
      update: { description: perm.description },
      create: { action: perm.action, description: perm.description },
    });
  }
  console.log(`  ✅ ${permissions.length} permissions seeded`);

  // Seed least-privilege role grants. SUPER_ADMIN remains an implicit full-access role.
  const grants: Record<string, string[]> = {
    OPERATIONS_ADMIN: [
      'admin:access', 'reports:dashboard', 'users:read', 'users:manage_status', 'ai:read',
      'support:read_tickets', 'support:write_tickets', 'notifications:send', 'content:manage', 'reports:ai',
    ],
    SUPPORT_ADMIN: [
      'admin:access', 'users:read', 'users:manage_status', 'support:read_tickets', 'support:write_tickets',
    ],
    FINANCE_ADMIN: [
      'admin:access', 'reports:dashboard', 'users:read', 'users:manage_billing', 'billing:read',
      'billing:write', 'discounts:manage', 'payments:refund', 'ai:read', 'reports:billing',
      'reports:subscriptions', 'reports:ai',
    ],
  };
  for (const [roleName, actions] of Object.entries(grants)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    const assigned = await prisma.permission.findMany({ where: { action: { in: actions } } });
    if (role && assigned.length) {
      await prisma.rolePermission.createMany({
        data: assigned.map(({ id }) => ({ roleId: role.id, permissionId: id })),
        skipDuplicates: true,
      });
    }
  }

  // ─── Plans ──────────────────────────────────────────────────────────────────
  const plans = [
    {
      name: 'FREE',
      stripePriceId: 'price_free_placeholder',
      priceMonthly: 0,
      priceYearly: 0,
      features: [
        { featureKey: 'ai_credits_monthly', value: '20' },
        { featureKey: 'resume_uploads', value: '2' },
        { featureKey: 'tracker_entries', value: '25' },
      ],
    },
    {
      name: 'PREMIUM',
      stripePriceId: 'price_premium_monthly_placeholder',
      priceMonthly: 15,
      priceYearly: 144,
      features: [
        { featureKey: 'ai_credits_monthly', value: '100' },
        { featureKey: 'resume_uploads', value: '10' },
        { featureKey: 'tracker_entries', value: '200' },
      ],
    },
    {
      name: 'PRO',
      stripePriceId: 'price_pro_monthly_placeholder',
      priceMonthly: 29,
      priceYearly: 276,
      features: [
        { featureKey: 'ai_credits_monthly', value: '500' },
        { featureKey: 'resume_uploads', value: '50' },
        { featureKey: 'tracker_entries', value: '-1' }, // unlimited
      ],
    },
  ];

  for (const plan of plans) {
    const { features, ...planData } = plan;
    const upserted = await prisma.plan.upsert({
      where: { name: planData.name },
      update: planData,
      create: planData,
    });

    // Recreate features
    await prisma.planFeature.deleteMany({ where: { planId: upserted.id } });
    await prisma.planFeature.createMany({
      data: features.map((f) => ({ ...f, planId: upserted.id })),
    });
  }
  console.log(`  ✅ ${plans.length} plans seeded (FREE, PREMIUM, PRO)`);

  console.log('🎉 Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
