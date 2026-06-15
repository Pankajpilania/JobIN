/**
 * Seed Admin Roles for Sprint 6
 *
 * Usage:
 *   cd apps/api
 *   npx ts-node prisma/seed-admin.ts --email=you@example.com
 *
 * This script:
 * 1. Creates all admin role records (SUPER_ADMIN, OPERATIONS_ADMIN, SUPPORT_ADMIN, FINANCE_ADMIN)
 * 2. Assigns SUPER_ADMIN to the specified email
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROLES = [
  { name: 'CANDIDATE',        description: 'Standard job seeker account' },
  { name: 'SUPER_ADMIN',      description: 'Full platform access — all admin functions' },
  { name: 'OPERATIONS_ADMIN', description: 'Can manage users, send notifications, view AI usage' },
  { name: 'SUPPORT_ADMIN',    description: 'Can view and respond to support tickets' },
  { name: 'FINANCE_ADMIN',    description: 'Can view billing, subscriptions, payments' },
];

const PERMISSIONS = [
  { action: 'users:read',         description: 'View user profiles and activity' },
  { action: 'users:write',        description: 'Modify user accounts' },
  { action: 'billing:read',       description: 'View billing and payment data' },
  { action: 'billing:write',      description: 'Modify subscriptions and issue refunds' },
  { action: 'ai:read',            description: 'View AI usage metrics' },
  { action: 'ai:bypass_limits',   description: 'Bypass AI rate limits' },
  { action: 'tickets:read',       description: 'View support tickets' },
  { action: 'tickets:write',      description: 'Respond to and close support tickets' },
  { action: 'notifications:send', description: 'Send email campaigns and notifications' },
  { action: 'audit:read',         description: 'View audit logs' },
];

async function seed() {
  const targetEmail = process.argv.find(a => a.startsWith('--email='))?.split('=')[1];

  console.log('🌱 Seeding admin roles and permissions…');

  // Create/upsert all roles
  for (const role of ROLES) {
    await prisma.role.upsert({
      where:  { name: role.name },
      create: role,
      update: { description: role.description },
    });
    console.log(`  ✓ Role: ${role.name}`);
  }

  // Create/upsert all permissions
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where:  { action: perm.action },
      create: perm,
      update: { description: perm.description },
    });
    console.log(`  ✓ Permission: ${perm.action}`);
  }

  // Assign all permissions to SUPER_ADMIN
  const superAdmin = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  const allPerms   = await prisma.permission.findMany();
  if (superAdmin) {
    for (const perm of allPerms) {
      await prisma.rolePermission.upsert({
        where:  { roleId_permissionId: { roleId: superAdmin.id, permissionId: perm.id } },
        create: { roleId: superAdmin.id, permissionId: perm.id },
        update: {},
      });
    }
    console.log(`  ✓ All permissions assigned to SUPER_ADMIN`);
  }

  // Assign SUPPORT_ADMIN permissions
  const supportAdmin = await prisma.role.findUnique({ where: { name: 'SUPPORT_ADMIN' } });
  if (supportAdmin) {
    const supportPerms = allPerms.filter(p => ['tickets:read', 'tickets:write', 'users:read'].includes(p.action));
    for (const perm of supportPerms) {
      await prisma.rolePermission.upsert({
        where:  { roleId_permissionId: { roleId: supportAdmin.id, permissionId: perm.id } },
        create: { roleId: supportAdmin.id, permissionId: perm.id },
        update: {},
      });
    }
  }

  // Assign FINANCE_ADMIN permissions
  const financeAdmin = await prisma.role.findUnique({ where: { name: 'FINANCE_ADMIN' } });
  if (financeAdmin) {
    const financePerms = allPerms.filter(p => ['billing:read', 'billing:write', 'users:read', 'audit:read'].includes(p.action));
    for (const perm of financePerms) {
      await prisma.rolePermission.upsert({
        where:  { roleId_permissionId: { roleId: financeAdmin.id, permissionId: perm.id } },
        create: { roleId: financeAdmin.id, permissionId: perm.id },
        update: {},
      });
    }
  }

  // Optionally assign SUPER_ADMIN to a specific user
  if (targetEmail) {
    const user = await prisma.user.findUnique({ where: { email: targetEmail } });
    if (!user) {
      console.warn(`  ⚠️  User with email ${targetEmail} not found — skipping role assignment`);
      console.warn(`      Make sure the user has signed in at least once first.`);
    } else {
      const role = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
      if (role) {
        await prisma.userRole.upsert({
          where:  { userId_roleId: { userId: user.id, roleId: role.id } },
          create: { userId: user.id, roleId: role.id },
          update: {},
        });
        console.log(`  ✅ Assigned SUPER_ADMIN to ${targetEmail} (userId: ${user.id})`);
      }
    }
  } else {
    console.log(`\n  ℹ️  To assign SUPER_ADMIN to yourself, run:`);
    console.log(`     npx ts-node prisma/seed-admin.ts --email=you@example.com`);
  }

  console.log('\n✅ Admin seed complete');
  await prisma.$disconnect();
}

seed().catch(async err => {
  console.error('❌ Seed failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
