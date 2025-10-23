import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await argon2.hash('Demo1234!');
  const user = await prisma.user.upsert({
    where: { email: 'demo@hotel.com' },
    update: {},
    create: { email: 'demo@hotel.com', passwordHash, name: 'Demo User', roles: ['user'] },
  });

  const hotel = await prisma.hotel.create({
    data: {
      name: 'Bangkok Central Hotel',
      description: 'Nice city hotel near BTS.',
      city: 'Bangkok', country: 'TH',
      amenities: ['wifi','pool','gym']
    }
  });

  const deluxe = await prisma.roomType.create({
    data: { hotelId: hotel.id, name: 'Deluxe Room', bedConfig: '1 King', sizeSqm: 28, amenities: ['ac','tv','wifi'] }
  });
  const suite = await prisma.roomType.create({
    data: { hotelId: hotel.id, name: 'Junior Suite', bedConfig: '1 King + Sofa', sizeSqm: 40, amenities: ['ac','tv','wifi','sofa'] }
  });

  // Basic rate plans
  const rp1 = await prisma.ratePlan.create({
    data: { hotelId: hotel.id, roomTypeId: deluxe.id, name: 'Room Only', includesBreakfast: false, cancellationRule: 'Free cancel 48h before' }
  });
  const rp2 = await prisma.ratePlan.create({
    data: { hotelId: hotel.id, roomTypeId: deluxe.id, name: 'Bed & Breakfast', includesBreakfast: true, cancellationRule: 'Non-refundable' }
  });

  // Inventory and overrides for next 7 days
  const today = new Date();
  for (let i=0;i<7;i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    await prisma.inventoryCalendar.create({
      data: { roomTypeId: deluxe.id, date: d, allotment: 5, stopSale: false, minStay: 1 }
    });
    await prisma.rateOverride.create({
      data: { roomTypeId: deluxe.id, ratePlanId: rp1.id, date: d, baseRate: 2200, reason: 'weekday' }
    });
    await prisma.rateOverride.create({
      data: { roomTypeId: deluxe.id, ratePlanId: rp2.id, date: d, baseRate: 2600, reason: 'weekday' }
    });
  }

  // Promotion
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 30);
  await prisma.promotion.create({
    data: { code: 'HELLO10', type: 'percent', value: 10, startDate: start, endDate: end }
  });

  console.log({ user, hotel, deluxe, suite });
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
