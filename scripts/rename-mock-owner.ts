import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Renaming mock hotel owner to prevent confusion with Super Admin...');
  
  const owner = await prisma.user.findUnique({
      where: { email: 'admin@hotel.com' }
  });

  if (owner) {
      await prisma.user.update({
          where: { email: 'admin@hotel.com' },
          data: { 
              name: 'Mock Hotel Owner',
              email: 'owner@mockhotel.com'
          }
      });
      console.log('✅ Renamed to Mock Hotel Owner (owner@mockhotel.com)');
  } else {
      console.log('Mock owner not found (already renamed or deleted).');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
