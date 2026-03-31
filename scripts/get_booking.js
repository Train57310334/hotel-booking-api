const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const booking = await prisma.booking.findFirst({
    select: { id: true, leadEmail: true }
  });
  console.log("BOOKING_TEST_ID=" + booking.id);
  console.log("BOOKING_TEST_EMAIL=" + booking.leadEmail);
}
main().catch(console.error).finally(() => prisma.$disconnect());
