import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const firstUser = await prisma.user.findFirst();
  if (!firstUser) {
      console.log('No user found');
      return;
  }

  const result = await prisma.hotel.updateMany({
      where: { ownerId: null },
      data: { ownerId: firstUser.id }
  });

  console.log(`Updated ${result.count} hotels to be owned by ${firstUser.email}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
