import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.roleAssignment.updateMany({
      where: { role: 'hotel_admin' },
      data: { role: 'owner' }
  });

  console.log(`Updated ${result.count} role assignments from 'hotel_admin' to 'owner'`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
