import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📅 Seeding Availability (Inventory + Physical Rooms)...');

  // 1. Get all Room Types
  const roomTypes = await prisma.roomType.findMany();
  console.log(`Found ${roomTypes.length} room types.`);

  if (roomTypes.length === 0) {
      console.log('No room types found! Run the main seed script first.');
      return;
  }

  // 2. Determine Date Range (Today -> +90 Days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const future = new Date(today);
  future.setDate(future.getDate() + 90);

  // 3. Loop through Room Types
  for (const rt of roomTypes) {
      // 3a. Ensure Inventory exists
      console.log(`Processing Inventory for: ${rt.name}`);
      
      for (let d = new Date(today); d < future; d.setDate(d.getDate() + 1)) {
          const dateForDb = new Date(d);
          
          await prisma.inventoryCalendar.upsert({
              where: { 
                  roomTypeId_date: { 
                      roomTypeId: rt.id, 
                      date: dateForDb 
                  } 
              },
              update: {
                  allotment: { set: 20 }, // Reset to 20 to ensure availability
                  stopSale: false
              },
              create: {
                  roomTypeId: rt.id,
                  date: dateForDb,
                  allotment: 20,
                  stopSale: false
              }
          });
      }

      // 3b. Ensure Physical Rooms exist (for Auto-Assignment)
      // Check if this room type has any rooms
      const existingRooms = await prisma.room.count({
          where: { roomTypeId: rt.id }
      });

      if (existingRooms < 5) {
          console.log(`creating physical rooms for ${rt.name}...`);
          // Create 10 rooms
          for (let i = 1; i <= 10; i++) {
              await prisma.room.create({
                  data: {
                      roomTypeId: rt.id,
                      roomNumber: `${rt.name.substring(0, 2).toUpperCase()}-${100 + i}`
                  }
              });
          }
      }
  }

  console.log('✅ Availability Fixed!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
