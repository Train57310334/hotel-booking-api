import { PrismaClient, RoomStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌟 Seeding Live Demo Data...');

  const passwordHash = await bcrypt.hash('demo1234', 10);

  // 1. Create Hotel
  const hotel = await prisma.hotel.create({
    data: {
      name: 'The Oceanfront Resort & Spa',
      description: 'A luxurious 5-star beachfront resort featuring world-class amenities and breathtaking ocean views.',
      city: 'Phuket',
      country: 'TH',
      address: '123 Beach Road, Patong',
      imageUrl: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=1200',
      logoUrl: 'https://cdn-icons-png.flaticon.com/512/2933/2933775.png',
      amenities: ['wifi', 'pool', 'spa', 'gym', 'restaurant', 'bar'],
      contactEmail: 'hello@oceanfrontresort.com',
      contactPhone: '+66 76 123 456',
      package: 'PRO',
      hasOnlinePayment: true,
      hasPromotions: true,
      maxRooms: 100,
      maxRoomTypes: 10,
    }
  });
  console.log(`✅ Created Hotel: ${hotel.name}`);

  // 2. Create Users (Staff & Manager)
  const staffRoles = [
    { email: 'manager@demo.com', name: 'Demo Manager', role: 'manager' },
    { email: 'reception@demo.com', name: 'Demo Reception', role: 'reception' },
    { email: 'housekeeper@demo.com', name: 'Demo Housekeeper', role: 'housekeeper' },
  ];

  for (const staff of staffRoles) {
    let user = await prisma.user.findUnique({ where: { email: staff.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: staff.email,
          passwordHash,
          name: staff.name,
          roles: ['hotel_admin'],
        }
      });
    }
    await prisma.roleAssignment.create({
      data: {
        userId: user.id,
        hotelId: hotel.id,
        role: staff.role
      }
    });
  }
  console.log(`✅ Created Staff Accounts`);

  // 3. Create Room Types
  const roomTypesData = [
    { name: 'Ocean View Standard', sizeSqm: 35, bedConfig: '1 King or 2 Twins', basePrice: 3500, maxAdults: 2, amenities: ['wifi', 'ac', 'tv', 'balcony'], images: ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=800'] },
    { name: 'Deluxe Pool Access', sizeSqm: 50, bedConfig: '1 King', basePrice: 5500, maxAdults: 2, amenities: ['wifi', 'ac', 'tv', 'pool_access', 'minibar'], images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=800'] },
    { name: 'Presidential Suite', sizeSqm: 120, bedConfig: '2 Kings', basePrice: 15000, maxAdults: 4, isFeatured: true, amenities: ['wifi', 'ac', 'tv', 'kitchen', 'jacuzzi', 'butler'], images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=800'] },
  ];

  const roomTypes = [];
  for (const rt of roomTypesData) {
    const created = await prisma.roomType.create({
      data: {
        hotelId: hotel.id,
        ...rt
      }
    });
    roomTypes.push(created);
  }
  console.log(`✅ Created ${roomTypes.length} Room Types`);

  // 4. Create Physical Rooms
  const rooms = [];
  let roomNum = 101;
  const statuses: RoomStatus[] = ['CLEAN', 'CLEAN', 'CLEAN', 'OCCUPIED', 'DIRTY'];
  
  for (const rt of roomTypes) {
    // 5 rooms per type
    for (let i = 0; i < 5; i++) {
      const room = await prisma.room.create({
        data: {
          roomTypeId: rt.id,
          roomNumber: `${roomNum++}`,
          status: statuses[Math.floor(Math.random() * statuses.length)],
        }
      });
      rooms.push(room);
    }
    roomNum += 100 - 5; // Next floor jumping to 201, 301, etc.
  }
  console.log(`✅ Created ${rooms.length} Physical Rooms`);

  // 5. Create Rate Plans
  const ratePlans = [];
  for (const rt of roomTypes) {
    const standardRate = await prisma.ratePlan.create({
      data: {
        hotelId: hotel.id,
        roomTypeId: rt.id,
        name: 'Standard Rate (Room Only)',
        includesBreakfast: false,
        cancellationRule: 'Free cancellation up to 3 days before.'
      }
    });
    const breakfastRate = await prisma.ratePlan.create({
      data: {
        hotelId: hotel.id,
        roomTypeId: rt.id,
        name: 'Bed & Breakfast',
        includesBreakfast: true,
        breakfastPrice: 500,
        cancellationRule: 'Free cancellation up to 7 days before.'
      }
    });
    ratePlans.push(standardRate, breakfastRate);
  }
  console.log(`✅ Created Rate Plans`);

  // 6. Create Promotions
  const promo = await prisma.promotion.create({
    data: {
      hotelId: hotel.id,
      code: 'DEMO20',
      type: 'percent',
      value: 20,
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
      conditions: 'Valid for all room types. For demonstration purposes.'
    }
  });
  console.log(`✅ Created Promotion: ${promo.code}`);

  // 7. Seed Inventory Calendar
  const today = new Date();
  today.setHours(0,0,0,0);
  for (const rt of roomTypes) {
    for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        
        await prisma.inventoryCalendar.create({
            data: { 
                roomTypeId: rt.id, 
                date: d, 
                allotment: 5
            }
        });
    }
  }
  console.log(`✅ Seeded Inventory Calendar for 30 days`);

  // 8. Create Bookings & Reviews
  const guests = [
    { name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
    { name: 'Sarah Connor', email: 'sarah@example.com', phone: '+1987654321' },
    { name: 'Bruce Wayne', email: 'bruce@wayne.com', phone: '+1122334455' },
    { name: 'Tony Stark', email: 'tony@stark.com', phone: '+5544332211' },
    { name: 'Clark Kent', email: 'clark@dailyplanet.com', phone: '+9988776655' },
    { name: 'Diana Prince', email: 'diana@themyscira.com', phone: '+4455667788' },
    { name: 'Peter Parker', email: 'peter@dailybugle.com', phone: '+3322110099' },
    { name: 'Natasha Romanoff', email: 'nat@shield.com', phone: '+8899776655' },
    { name: 'Steve Rogers', email: 'steve@avengers.com', phone: '+1122112211' },
    { name: 'Wanda Maximoff', email: 'wanda@westview.com', phone: '+7788990011' },
  ];

  const bookingStatuses = ['confirmed', 'confirmed', 'confirmed', 'pending', 'cancelled', 'checked_in', 'checked_out', 'checked_out'];

  for (let i = 0; i < 15; i++) {
    const guest = guests[i % guests.length];
    const rt = roomTypes[i % roomTypes.length];
    const rp = ratePlans.find(r => r.roomTypeId === rt.id);
    
    // Distribute bookings throughout the month
    const checkIn = new Date(today);
    checkIn.setDate(checkIn.getDate() + (Math.floor(Math.random() * 20) - 5)); // -5 to +15 days from today
    
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + Math.floor(Math.random() * 4) + 1); // 1-4 nights
    
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24));
    const totalAmount = (rt.basePrice || 3500) * nights + (rp.includesBreakfast ? 500 * 2 * nights : 0);
    
    const status = bookingStatuses[Math.floor(Math.random() * bookingStatuses.length)];

    let roomId = null;
    if (['checked_in', 'checked_out'].includes(status)) {
        const availableRooms = rooms.filter(r => r.roomTypeId === rt.id);
        if (availableRooms.length > 0) {
            roomId = availableRooms[0].id; // Just for mock demo visualization
        }
    }

    const booking = await prisma.booking.create({
      data: {
        hotelId: hotel.id,
        roomTypeId: rt.id,
        ratePlanId: rp.id,
        roomId: roomId,
        checkIn,
        checkOut,
        guestsAdult: Math.floor(Math.random() * 2) + 1,
        guestsChild: Math.floor(Math.random() * 2),
        totalAmount,
        status,
        leadName: guest.name,
        leadEmail: guest.email,
        leadPhone: guest.phone,
        specialRequests: Math.random() > 0.5 ? 'High floor preferred' : null,
        source: Math.random() > 0.3 ? 'direct' : 'OTA',
      }
    });

    if (['confirmed', 'checked_in', 'checked_out'].includes(status)) {
        await prisma.payment.create({
            data: {
                bookingId: booking.id,
                provider: 'stripe',
                amount: totalAmount,
                status: 'captured',
                method: 'card', 
            }
        });
    }

    if (status === 'checked_out' && Math.random() > 0.3) {
        let u = await prisma.user.findUnique({ where: { email: guest.email }});
        if (!u) {
            u = await prisma.user.create({
                data: { email: guest.email, passwordHash: 'none', name: guest.name, roles: ['user'] }
            });
        }
        await prisma.review.create({
            data: {
                hotelId: hotel.id,
                userId: u.id,
                rating: Math.floor(Math.random() * 2) + 4, // 4 or 5 stars
                comment: 'Had an absolutely incredible time here! The service was exceptional and the room was perfect.',
                status: 'approved'
            }
        });
    }
  }
  console.log(`✅ Created 15 Bookings with mixed statuses, Payments, and Reviews`);

  console.log('🎉 Demo data successfully generated!');
  console.log(`
  🏨 Hotel: ${hotel.name}
  👨‍💼 Manager Login: manager@demo.com / demo1234
  🛎️ Reception Login: reception@demo.com / demo1234
  🧹 Housekeeper Login: housekeeper@demo.com / demo1234
  `);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
