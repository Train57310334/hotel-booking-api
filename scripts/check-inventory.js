const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find the Featured room (Deluxe Twin Room)
    const room = await prisma.roomType.findFirst({
        where: { isFeatured: true },
        include: {
            inventory: true,
            hotel: true
        }
    });

    if (!room) {
        console.log('No Featured room found.');
        return;
    }

    console.log(`Checking Room: ${room.name} (${room.id})`);
    console.log(`Hotel: ${room.hotel.name} (${room.hotel.id})`);
    console.log(`Inventory Records: ${room.inventory.length}`);

    // Check for today/tomorrow
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const invToday = room.inventory.find(i => new Date(i.date).getTime() === today.getTime());
    const invTom = room.inventory.find(i => new Date(i.date).getTime() === tomorrow.getTime());

    console.log(`Inventory Today (${today.toISOString().split('T')[0]}):`, invToday || 'None');
    console.log(`Inventory Tomorrow (${tomorrow.toISOString().split('T')[0]}):`, invTom || 'None');
}

main().finally(() => prisma.$disconnect());
