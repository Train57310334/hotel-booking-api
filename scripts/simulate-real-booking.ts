import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { BookingsService } from '../src/modules/bookings/bookings.service';
import { RatesService } from '../src/modules/rates/rates.service';
import { PromotionsService } from '../src/modules/promotions/promotions.service';
import { PrismaService } from '../src/common/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const bookingsService = app.get(BookingsService);
  const ratesService = app.get(RatesService);
  const promotionsService = app.get(PromotionsService);
  const prisma = app.get(PrismaService);

  console.log('🚀 Starting Real Booking Simulation...');

  // 1. Pick a User
  const user = await prisma.user.findFirst({ where: { email: 'demo@hotel.com' } });
  if (!user) throw new Error('Demo user not found');

  // 2. Pick a Room Type & Rate Plan
  const roomType = await prisma.roomType.findFirst({ include: { rooms: true } });
  const ratePlan = await prisma.ratePlan.findFirst({ where: { roomTypeId: roomType.id } });
  
  if (!roomType || !ratePlan) throw new Error('No RoomType or RatePlan found');

  // Scenario 1: Promo Code Booking (Next Week)
  await createScenario(
      'Scenario 1: Couple Anniversary (Promo Applied)',
      bookingsService, ratesService, promotionsService, prisma,
      user, roomType, ratePlan,
      7, 2, 'WELCOME10'
  );

  // Scenario 2: Standard Booking (2 Weeks out)
  await createScenario(
      'Scenario 2: Business Trip (No Promo)',
      bookingsService, ratesService, promotionsService, prisma,
      user, roomType, ratePlan,
      14, 3, null
  );

  await app.close();
}

async function createScenario(
    name, bookingsService, ratesService, promotionsService, prisma,
    user, roomType, ratePlan,
    daysOut, nights, promoCode
) {
    console.log(`\n--- ${name} ---`);
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + daysOut);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + nights);

    console.log(`📅 Dates: ${checkIn.toISOString().split('T')[0]} to ${checkOut.toISOString().split('T')[0]} (${nights} Nights)`);
    
    // Price
    const basePrice = await ratesService.calculatePrice(roomType.id, ratePlan.id, checkIn, checkOut);
    let finalPrice = basePrice;
    console.log(`💰 Base Price: ${basePrice.toLocaleString()} THB`);

    // Promo
    if (promoCode) {
        try {
            const validation = await promotionsService.validateCode(promoCode, basePrice);
            console.log(`🎟️ Applying Promo: ${promoCode} (-${validation.discountAmount.toLocaleString()} THB)`);
            finalPrice = basePrice - validation.discountAmount;
        } catch (e) {
            console.log(`⚠️ Promo Failed: ${e.message}`);
        }
    }
    console.log(`💸 Final Price: ${finalPrice.toLocaleString()} THB`);

    // Find Room
    const bookedRoomIds = await prisma.booking.findMany({
        where: {
            checkIn: { lt: checkOut },
            checkOut: { gt: checkIn },
            status: { not: 'cancelled' }
        },
        select: { roomId: true }
    }).then(b => b.map(x => x.roomId));

    const availableRoom = roomType.rooms.find(r => !bookedRoomIds.includes(r.id));
    if (!availableRoom) {
        console.log('❌ Skipped: No rooms available.');
        return;
    }

    // Create
    const booking = await bookingsService.create({
        userId: user.id,
        hotelId: roomType.hotelId,
        roomTypeId: roomType.id,
        roomId: availableRoom.id,
        ratePlanId: ratePlan.id,
        checkIn: checkIn,
        checkOut: checkOut,
        guests: { adult: 2, child: 0 },
        leadGuest: { name: user.name, email: user.email, phone: user.phone },
        totalAmount: finalPrice,
        paymentMethod: 'credit_card',
        paymentStatus: 'paid',
        specialRequests: promoCode ? `Promo Code: ${promoCode}` : 'Late Check-in'
    });

    console.log(`✅ Booking Created! ID: ${booking.id}`);
}

bootstrap();
