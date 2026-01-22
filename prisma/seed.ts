import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Demo1234!', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@hotel.com' },
    update: { passwordHash },
    create: { email: 'demo@hotel.com', passwordHash, name: 'Demo User', roles: ['user'] },
  });

  const hotels = [
    {
      name: 'Bangkok Central Hotel',
      description: 'Luxury hotel in the heart of Bangkok with easy access to shopping malls.',
      city: 'Bangkok', country: 'TH',
      imageUrl: '/images/bangkok-central.png',
      amenities: ['wifi', 'pool', 'gym', 'spa', 'bar'],
      price: 2200
    },
    {
      name: 'Chiang Mai Riverside Resort',
      description: 'Peaceful resort by the Ping River, perfect for relaxation.',
      city: 'Chiang Mai', country: 'TH',
      imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=1200',
      amenities: ['wifi', 'pool', 'garden', 'breakfast'],
      price: 1800
    },
    {
      name: 'Phuket Ocean View Villas',
      description: 'Stunning ocean views with private pool villas.',
      city: 'Phuket', country: 'TH',
      imageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=1200',
      amenities: ['wifi', 'pool', 'beach', 'massage'],
      price: 4500
    },
    {
      name: 'Pattaya Beach Front Hotel',
      description: 'Modern hotel right on the beach, vibrant nightlife nearby.',
      city: 'Pattaya', country: 'TH',
      imageUrl: 'https://images.unsplash.com/photo-1596436889106-be35e843f974?q=80&w=1200',
      amenities: ['wifi', 'bar', 'pool', 'nightclub'],
      price: 1500
    },
    {
      name: 'Khao Yai Nature Lodge',
      description: 'Escape to nature with mountain views and fresh air.',
      city: 'Nakhon Ratchasima', country: 'TH',
      imageUrl: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?q=80&w=1200',
      amenities: ['wifi', 'hiking', 'garden', 'bbq'],
      price: 3200
    }
  ];

  for (const h of hotels) {
    const hotel = await prisma.hotel.create({
      data: {
        name: h.name,
        description: h.description,
        city: h.city,
        country: h.country,
        imageUrl: h.imageUrl,
        amenities: h.amenities
      }
    });

    const deluxe = await prisma.roomType.create({
      data: { hotelId: hotel.id, name: 'Deluxe Room', bedConfig: '1 King', sizeSqm: 32, amenities: ['ac', 'tv', 'wifi'] }
    });

    // Rate Plans
    const rp1 = await prisma.ratePlan.create({
      data: { hotelId: hotel.id, roomTypeId: deluxe.id, name: 'Standard Rate', includesBreakfast: false, cancellationRule: 'Free cancel 24h' }
    });

    // Inventory
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      await prisma.inventoryCalendar.create({
        data: { roomTypeId: deluxe.id, date: d, allotment: 10, stopSale: false }
      });
      await prisma.rateOverride.create({
        data: { roomTypeId: deluxe.id, ratePlanId: rp1.id, date: d, baseRate: h.price }
      });
    }
  }

  console.log('Seed completed with 5 hotels');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
