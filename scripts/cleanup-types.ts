import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roomTypes = await prisma.roomType.findMany({
    include: {
      rooms: true,
      bookings: true // Check bookings too just in case
    }
  });

  console.log(`Found ${roomTypes.length} room types.`);

  let deletedCount = 0;
  for (const type of roomTypes) {
    if (type.rooms.length === 0 && type.bookings.length === 0) {
      console.log(`Deleting empty type: ${type.name} (${type.id})`);
      
      // Delete child records if any (e.g., rate plans, calendar) - Prisma might handle this via Cascade or we do manually
      // RatePlan, InventoryCalendar, RateOverride usually cascade or need deletion
      await prisma.inventoryCalendar.deleteMany({ where: { roomTypeId: type.id }});
      await prisma.rateOverride.deleteMany({ where: { roomTypeId: type.id }});
      await prisma.ratePlan.deleteMany({ where: { roomTypeId: type.id }});
      
      await prisma.roomType.delete({
        where: { id: type.id }
      });
      deletedCount++;
    }
  }

  console.log(`Deleted ${deletedCount} empty room types.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
