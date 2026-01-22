import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding fresh data for Admin Dashboard...');

  // 1. Ensure User
  const email = 'demo@hotel.com';
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const passwordHash = await bcrypt.hash('Demo1234!', 10);
    user = await prisma.user.create({
      data: { email, passwordHash, name: 'Demo User', roles: ['user', 'hotel_admin'] },
    });
  }

  // 2. Ensure Hotel & Rooms
  let hotel = await prisma.hotel.findFirst();
  if (!hotel) {
    hotel = await prisma.hotel.create({
        data: {
            name: 'Grand Hyatt Erawan',
            description: 'Luxury 5-star hotel in Bangkok',
            city: 'Bangkok', country: 'TH',
            imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200'
        }
    });
  }

  let roomType = await prisma.roomType.findFirst({ where: { hotelId: hotel.id } });
  if (!roomType) {
    roomType = await prisma.roomType.create({
      data: { hotelId: hotel.id, name: 'Deluxe Suite', bedConfig: '1 King', sizeSqm: 45, amenities: ['wifi', 'ac', 'bath'] }
    });
  }
  
  // Ensure RatePlan
  let ratePlan = await prisma.ratePlan.findFirst({ where: { roomTypeId: roomType.id } });
  if (!ratePlan) {
      ratePlan = await prisma.ratePlan.create({
          data: { hotelId: hotel.id, roomTypeId: roomType.id, name: 'Best Flexible Rate', includesBreakfast: true }
      });
  }

  // 3. Create RateOverride & Inventory for THIS MONTH (to show specific data on chart)
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  for (let i = 0; i < 30; i++) {
     const d = new Date(startOfMonth);
     d.setDate(d.getDate() + i);
     
     await prisma.inventoryCalendar.upsert({
         where: { roomTypeId_date: { roomTypeId: roomType.id, date: d } },
         update: { allotment: 20 },
         create: { roomTypeId: roomType.id, date: d, allotment: 20 }
     });
  }

  // 3.5 Create Real Rooms
  const rooms = [];
  for(let i=101; i<=110; i++) {
      const r = await prisma.room.create({
          data: { roomTypeId: roomType.id } // In real schema, might have room number, but id is cuid.
      });
      rooms.push(r);
  }

  // 4. Create Fake Bookings (Past 6 months + Future)
  const statuses = ['confirmed', 'confirmed', 'confirmed', 'pending', 'cancelled', 'checked_in', 'checked_out'];
  
  // Helper for random int
  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  for (let i = 0; i < 50; i++) {
    const daysOffset = randomInt(-100, 30); // Mostly past, some future
    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + daysOffset);
    
    // CheckIn is usually a bit after booking date
    const checkIn = new Date(bookingDate);
    checkIn.setDate(checkIn.getDate() + randomInt(1, 14));
    
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + randomInt(1, 5));

    const room = rooms[Math.floor(Math.random() * rooms.length)];

    await prisma.booking.create({
      data: {
        userId: user.id,
        hotelId: hotel.id,
        roomTypeId: roomType.id,
        ratePlanId: ratePlan.id,
        roomId: room.id, // Link to real room
        checkIn,
        checkOut,
        guestsAdult: randomInt(1, 3),
        guestsChild: randomInt(0, 2),
        totalAmount: randomInt(2000, 15000),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        leadName: `Guest ${i + 1}`,
        leadEmail: `guest${i + 1}@example.com`,
        leadPhone: '0812345678',
        specialRequests: Math.random() > 0.7 ? 'Late check-in' : null,
        createdAt: bookingDate,
      }
    }).catch(e => console.error(`Failed to seed booking ${i}:`, e.message));
  }

  console.log('✅ Fresh Seed Data Created!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
