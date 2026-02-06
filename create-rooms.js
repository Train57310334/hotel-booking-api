const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createPhysicalRooms() {
    const roomTypeId = 'cml35okne000h12d2d120sja3'; // Pattaya Standard Room

    console.log('--- Creating Physical Rooms ---');

    // Create 10 rooms: 101 to 110
    for (let i = 1; i <= 10; i++) {
        const roomNumber = `1${i.toString().padStart(2, '0')}`;
        await prisma.room.create({
            data: {
                roomTypeId,
                roomNumber
            }
        });
        console.log(`Created Room ${roomNumber}`);
    }
    console.log('✅ Created 10 physical rooms');
}

createPhysicalRooms()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
