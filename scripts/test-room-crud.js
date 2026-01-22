const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Starting Room CRUD Test...');

    try {
        // 1. Get first hotel
        const hotel = await prisma.hotel.findFirst();
        if (!hotel) throw new Error('No hotel found. Seeding needed?');
        console.log('Hotel Found:', hotel.name);

        // 2. Create Room Type
        const roomType = await prisma.roomType.create({
            data: {
                hotelId: hotel.id,
                name: 'Test Room Type ' + Date.now(),
                basePrice: 1000,
                description: 'Test Description'
            }
        });
        console.log('Room Type Created:', roomType.id);

        // 3. Create Room
        const room = await prisma.room.create({
            data: {
                roomTypeId: roomType.id
            }
        });
        console.log('Room Created:', room.id);

        // 4. Delete Room
        await prisma.room.delete({ where: { id: room.id } });
        console.log('Room Deleted:', room.id);

        // 5. Delete Room Type (Clean up)
        await prisma.roomType.delete({ where: { id: roomType.id } });
        console.log('Room Type Deleted:', roomType.id);

        console.log('Test Passed!');
    } catch (e) {
        console.error('Test Failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
