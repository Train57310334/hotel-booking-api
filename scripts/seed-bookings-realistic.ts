import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

const NAMES = [
    'Alice Johnson', 'Bob Smith', 'Charlie Brown', 'David Wilson', 
    'Eva Green', 'Frank White', 'Grace Lee', 'Hannah Black',
    'Ivan Red', 'Jack Blue', 'Kelly King', 'Liam Scott',
    'Mia Young', 'Noah Hall', 'Olivia Adams', 'Peter Parker',
    'Quinn Turner', 'Rachel Scott', 'Sam Carter', 'Tom Hanks',
    'Somchai Jaidee', 'Suda Rakdee', 'Nadech Kugimiya', 'Yaya Urassaya'
];

const FOLIO_TYPES = ['ROOM_SERVICE', 'LAUNDRY', 'MINIBAR', 'OTHER'];
const FOLIO_DESCRIPTIONS = {
    'ROOM_SERVICE': ['Pad Thai & Coke', 'Club Sandwich', 'Breakfast in Bed', 'Midnight Snack'],
    'LAUNDRY': ['Dry Cleaning (Suit)', 'Express Laundry', 'Ironing Service'],
    'MINIBAR': ['Evian Water', 'Singha Beer (x2)', 'Pringles', 'Chocolate Bar'],
    'OTHER': ['Airport Transfer', 'Spa Massage', 'Late Checkout Fee']
};

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);

  console.log('--- Seeding Realistic Bookings (Enhanced) ---');

  // 1. Get Rooms and RatePlans
  const rooms = await prisma.room.findMany({ include: { roomType: true } });
  if (rooms.length === 0) {
      console.error('No rooms found. Please create rooms first.');
      await app.close();
      return;
  }
  
  // Get a valid rate plan for each room type
  const roomTypes = await prisma.roomType.findMany({ include: { ratePlans: true } });
  const ratePlanMap = new Map();
  roomTypes.forEach(rt => {
      if (rt.ratePlans.length > 0) ratePlanMap.set(rt.id, rt.ratePlans[0].id);
  });

  let createdCount = 0;
  
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0); // Normalize to midnight

  for (let i = 0; i < 40; i++) {
      const room = rooms[getRandomInt(0, rooms.length - 1)];
      const ratePlanId = ratePlanMap.get(room.roomTypeId);
      
      if (!ratePlanId) continue;

      for (let attempt = 0; attempt < 5; attempt++) {
          const startOffset = getRandomInt(-30, 30); // Spread bookings over 2 months
          const duration = getRandomInt(1, 5);
          
          const checkIn = addDays(baseDate, startOffset);
          const checkOut = addDays(checkIn, duration);
          
          // Check overlap
          const conflict = await prisma.booking.findFirst({
              where: {
                  roomId: room.id,
                  status: { notIn: ['cancelled', 'no_show'] },
                  checkIn: { lt: checkOut },
                  checkOut: { gt: checkIn }
              }
          });

          if (!conflict) {
              // Determine logical status
              let statusOptions = [];
              if (checkOut < baseDate) {
                  // Past booking
                  statusOptions = ['checked_out', 'checked_out', 'checked_out', 'cancelled', 'no_show'];
              } else if (checkIn <= baseDate && checkOut >= baseDate) {
                  // Active booking today
                  statusOptions = ['checked_in', 'checked_in', 'confirmed']; // Maybe they haven't checked in yet
              } else {
                  // Future booking
                  statusOptions = ['confirmed', 'confirmed', 'pending', 'cancelled'];
              }

              const status = statusOptions[getRandomInt(0, statusOptions.length - 1)];
              const name = NAMES[i % NAMES.length];
              const phone = `0${getRandomInt(80, 99)}${getRandomInt(1000000, 9999999)}`;
              const amount = getRandomInt(1500, 6000) * duration;
              const guestsAdult = getRandomInt(1, room.roomType.maxAdults || 2);

              const bookingOptions: Prisma.BookingCreateInput = {
                  hotel: { connect: { id: room.roomType.hotelId } },
                  roomType: { connect: { id: room.roomTypeId } },
                  room: { connect: { id: room.id } },
                  ratePlan: { connect: { id: ratePlanId } },
                  checkIn,
                  checkOut,
                  leadName: name,
                  leadEmail: name.toLowerCase().replace(/ /g, '.') + '@example.com',
                  leadPhone: phone,
                  totalAmount: amount,
                  guestsAdult,
                  guestsChild: 0,
                  status: status,
                  payment: {
                      create: {
                          amount: amount,
                          provider: 'Credit Card',
                          method: 'Credit Card',
                          status: ['pending', 'cancelled', 'no_show'].includes(status) ? 'pending' : 'captured',
                          currency: 'THB'
                      }
                  },
                  guests: {
                      create: {
                           name: name,
                           idType: 'national_id',
                           idNumber: `${getRandomInt(1, 9)}${getRandomInt(100000000000, 999999999999)}`
                      }
                  }
              };

              // Add a second guest randomly if adults > 1
              if (guestsAdult > 1 && Math.random() > 0.5) {
                   const secondGuestName = NAMES[(i + 1) % NAMES.length];
                   bookingOptions.guests.create = [
                       bookingOptions.guests.create as any,
                       {
                           name: secondGuestName,
                           idType: 'passport',
                           idNumber: `P${getRandomInt(1000000, 9999999)}`
                       }
                   ];
              }

              // Add Folio Charges for checked_in or checked_out bookings
              if (['checked_in', 'checked_out'].includes(status) && Math.random() > 0.3) {
                  const chargeCount = getRandomInt(1, 4);
                  const charges = [];
                  for(let c=0; c < chargeCount; c++) {
                      const type = FOLIO_TYPES[getRandomInt(0, FOLIO_TYPES.length - 1)];
                      const typeDescArr = FOLIO_DESCRIPTIONS[type];
                      const desc = typeDescArr[getRandomInt(0, typeDescArr.length - 1)];
                      
                      // Assign a random date between check-in and checkout (or today if active)
                      let chargeDate = new Date(checkIn);
                      let maxOffset = Math.min(duration, Math.floor((new Date().getTime() - checkIn.getTime()) / (1000*60*60*24)));
                      if (maxOffset < 0) maxOffset = 0;
                      chargeDate = addDays(checkIn, getRandomInt(0, maxOffset));

                      charges.push({
                          description: desc,
                          amount: getRandomInt(100, 1500),
                          type: type,
                          date: chargeDate
                      });
                  }
                  bookingOptions.folioCharges = { create: charges };
              }

              await prisma.booking.create({ data: bookingOptions });
              
              console.log(`Created Booking for ${name}: ${checkIn.toISOString().split('T')[0]} to ${checkOut.toISOString().split('T')[0]} (${status}) => Amount: ${amount}`);
              
              // If checked_in, mark the room as OCCUPIED
              if (status === 'checked_in') {
                   await prisma.room.update({ where: { id: room.id }, data: { status: 'OCCUPIED' } });
              }
              // If checked_out, maybe DIRTY
              if (status === 'checked_out') {
                   await prisma.room.update({ where: { id: room.id }, data: { status: 'DIRTY' } });
              }

              createdCount++;
              break; // Success for this attempt
          }
      }
  }

  console.log(`\nSuccessfully created ${createdCount} diverse bookings.`);
  await app.close();
}

bootstrap();
