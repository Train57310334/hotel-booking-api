"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const prisma_service_1 = require("../src/common/prisma/prisma.service");
const NAMES = [
    'Alice Johnson', 'Bob Smith', 'Charlie Brown', 'David Wilson',
    'Eva Green', 'Frank White', 'Grace Lee', 'Hannah Black',
    'Ivan Red', 'Jack Blue', 'Kelly King', 'Liam Scott',
    'Mia Young', 'Noah Hall', 'Olivia Adams', 'Peter Parker',
    'Quinn Turner', 'Rachel Scott', 'Sam Carter', 'Tom Hanks'
];
const STATUSES = ['confirmed', 'confirmed', 'confirmed', 'pending', 'checked_in', 'checked_out'];
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, { logger: false });
    const prisma = app.get(prisma_service_1.PrismaService);
    console.log('--- Seeding Realistic Bookings ---');
    const rooms = await prisma.room.findMany({ include: { roomType: true } });
    if (rooms.length === 0) {
        console.error('No rooms found. Please create rooms first.');
        await app.close();
        return;
    }
    const roomTypes = await prisma.roomType.findMany({ include: { ratePlans: true } });
    const ratePlanMap = new Map();
    roomTypes.forEach(rt => {
        if (rt.ratePlans.length > 0)
            ratePlanMap.set(rt.id, rt.ratePlans[0].id);
    });
    let createdCount = 0;
    const baseDate = new Date();
    for (let i = 0; i < 20; i++) {
        const room = rooms[getRandomInt(0, rooms.length - 1)];
        const ratePlanId = ratePlanMap.get(room.roomTypeId);
        if (!ratePlanId)
            continue;
        for (let attempt = 0; attempt < 5; attempt++) {
            const startOffset = getRandomInt(-7, 25);
            const duration = getRandomInt(1, 4);
            const checkIn = addDays(baseDate, startOffset);
            const checkOut = addDays(checkIn, duration);
            const conflict = await prisma.booking.findFirst({
                where: {
                    roomId: room.id,
                    status: { not: 'cancelled' },
                    checkIn: { lt: checkOut },
                    checkOut: { gt: checkIn }
                }
            });
            if (!conflict) {
                const status = STATUSES[getRandomInt(0, STATUSES.length - 1)];
                const name = NAMES[i % NAMES.length];
                await prisma.booking.create({
                    data: {
                        hotelId: room.roomType.hotelId,
                        roomTypeId: room.roomTypeId,
                        roomId: room.id,
                        ratePlanId,
                        checkIn,
                        checkOut,
                        leadName: name,
                        leadEmail: name.toLowerCase().replace(/ /g, '.') + '@example.com',
                        leadPhone: '0812345678',
                        totalAmount: getRandomInt(1000, 5000) * duration,
                        guestsAdult: getRandomInt(1, 2),
                        guestsChild: 0,
                        status: status,
                        payment: {
                            create: {
                                amount: getRandomInt(1000, 5000) * duration,
                                provider: 'credit_card',
                                status: status === 'pending' ? 'pending' : 'confirmed',
                                currency: 'THB'
                            }
                        }
                    }
                });
                console.log(`Created Booking for ${name}: ${checkIn.toISOString().split('T')[0]} to ${checkOut.toISOString().split('T')[0]} (${status})`);
                createdCount++;
                break;
            }
        }
    }
    console.log(`\nSuccessfully created ${createdCount} bookings.`);
    await app.close();
}
bootstrap();
//# sourceMappingURL=seed-bookings-realistic.js.map