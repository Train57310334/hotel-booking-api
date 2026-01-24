import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROOM_IMAGES = [
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=800', // Room 1
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=800', // Room 2
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=800', // Room 3
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=800', // Room 4
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=800', // Room 5
];

async function main() {
  console.log('🖼️  Fixing missing images...');

  // 1. Fix Hotels
  const hotels = await prisma.hotel.findMany();
  for (const hotel of hotels) {
      if (!hotel.imageUrl) {
          await prisma.hotel.update({
              where: { id: hotel.id },
              data: { imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1600' }
          });
          console.log(`Updated Hotel ${hotel.name} image.`);
      }
  }

  // 2. Fix Room Types
  const roomTypes = await prisma.roomType.findMany();
  let imgIndex = 0;

  for (const rt of roomTypes) {
      if (!rt.images || rt.images.length === 0) {
          const img = ROOM_IMAGES[imgIndex % ROOM_IMAGES.length];
          await prisma.roomType.update({
              where: { id: rt.id },
              data: { images: [img] }
          });
          console.log(`Updated RoomType ${rt.name} image.`);
          imgIndex++;
      }
  }

  console.log('✅ Done!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
