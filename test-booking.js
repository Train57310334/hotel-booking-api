const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const booking = await prisma.booking.findFirst({
    where: { status: 'confirmed' }
  });
  console.log(`ID: ${booking.id}`);
  console.log(`Email: ${booking.leadEmail}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
