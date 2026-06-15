const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'pkpilania76@gmail.com';
  
  // Find user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`User with email ${email} not found. Are you sure you signed up?`);
    process.exit(1);
  }

  // Find or create SUPER_ADMIN role
  let role = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  if (!role) {
    role = await prisma.role.create({ data: { name: 'SUPER_ADMIN' } });
  }

  // Assign role to user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: role.id,
      }
    },
    update: {},
    create: {
      userId: user.id,
      roleId: role.id,
    }
  });

  console.log(`Successfully assigned SUPER_ADMIN role to ${email}!`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
