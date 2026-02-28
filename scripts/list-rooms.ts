import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roomTypes = await prisma.roomType.findMany({
    include: {
      rooms: {
        orderBy: { roomNumber: 'asc' }
      }
    }
  });

  for (const type of roomTypes) {
    console.log(`\nType: ${type.name} (${type.id})`);
    console.log(`Count: ${type.rooms.length}`);
    if (type.rooms.length > 0) {
      console.log('Rooms:', type.rooms.map(r => r.roomNumber).join(', '));
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
