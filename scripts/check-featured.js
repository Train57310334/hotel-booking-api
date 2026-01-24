const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Checking RoomTypes...');
    const rooms = await prisma.roomType.findMany();
    console.log('Total RoomTypes:', rooms.length);
    for (const r of rooms) {
        console.log(`- ${r.name}: isFeatured = ${r.isFeatured}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
