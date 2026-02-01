
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔥 HARD RESET: Wiping ENTIRE Database...');

  // 1. Delete Dependencies first
  console.log('Deleting Payments...');
  await prisma.payment.deleteMany({});
  
  console.log('Deleting Expenses...');
  await prisma.expense.deleteMany({});

  console.log('Deleting Role Assignments...');
  await prisma.roleAssignment.deleteMany({});

  console.log('Deleting Bookings...');
  await prisma.booking.deleteMany({});

  console.log('Deleting Reviews...');
  await prisma.review.deleteMany({});

  console.log('Deleting Rate Overrides & Plans...');
  await prisma.rateOverride.deleteMany({});
  await prisma.ratePlan.deleteMany({});

  console.log('Deleting Inventory...');
  await prisma.inventoryCalendar.deleteMany({});

  console.log('Deleting Physical Rooms...');
  await prisma.room.deleteMany({});

  console.log('Deleting Room Types...');
  await prisma.roomType.deleteMany({});

  console.log('Deleting Promotions...');
  await prisma.promotion.deleteMany({});

  console.log('Deleting Hotels...');
  await prisma.hotel.deleteMany({});

  // 2. Delete Users (Since user asked for "New User Login")
  console.log('Deleting Users...');
  await prisma.user.deleteMany({});

  console.log('✨ System is completely clean. Ready for new User Registration.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
