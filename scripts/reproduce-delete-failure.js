const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Starting Reproduction Script...');

    try {
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error('No hotel found');

        const roomType = await prisma.roomType.create({
            data: {
                hotelId: hotel.id,
                name: 'Temp Suite',
                basePrice: 5000
            }
        });

        const room = await prisma.room.create({
            data: { roomTypeId: roomType.id }
        });
        console.log('Room Created:', room.id);

        // Create a dummy booking for this room
        // Note: Creating booking requires valid relations (User, RatePlan)
        // We'll try to find existing ones or skip if too complex, but likely this is the cause.
        // Let's create a minimal booking.

        // Need a user
        const user = await prisma.user.findFirst();
        // Need a rate plan
        let ratePlan = await prisma.ratePlan.findFirst({ where: { roomTypeId: roomType.id } });
        if (!ratePlan) {
            ratePlan = await prisma.ratePlan.create({
                data: {
                    hotelId: hotel.id,
                    roomTypeId: roomType.id,
                    name: 'Standard',
                }
            });
        }

        await prisma.booking.create({
            data: {
                hotelId: hotel.id,
                roomTypeId: roomType.id,
                ratePlanId: ratePlan.id,
                roomId: room.id,
                checkIn: new Date(),
                checkOut: new Date(Date.now() + 86400000),
                guestsAdult: 2,
                guestsChild: 0,
                totalAmount: 5000,
                status: 'confirmed',
                leadName: 'Tester',
                leadEmail: 'test@example.com',
                leadPhone: '123',
                userId: user ? user.id : undefined
            }
        });
        console.log('Booking Created for Room');

        // Now try to delete the room
        console.log('Attempting to delete room...');
        await prisma.room.delete({ where: { id: room.id } });
        console.log('Room Deleted (Unexpected)');

    } catch (e) {
        console.log('Caught Expected Error:', e.code, e.meta || e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
