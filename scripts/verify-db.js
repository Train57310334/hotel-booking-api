const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    await prisma.hotel.updateMany({
        where: { package: 'LITE' },
        data: {
            maxRooms: 2,
            maxRoomTypes: 1
        }
    });

    console.log("\n--- Hotel Limits ---");
    const hotels = await prisma.hotel.findMany({ select: { id: true, name: true, package: true, maxRooms: true, maxRoomTypes: true } });
    hotels.forEach(h => console.log(`${h.name} (${h.package}) - maxRooms: ${h.maxRooms}, maxRoomTypes: ${h.maxRoomTypes}`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    });

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    });
