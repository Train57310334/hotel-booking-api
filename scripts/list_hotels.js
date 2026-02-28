const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const hotels = await prisma.hotel.findMany();
    console.log('--- HOTELS ---');
    hotels.forEach(h => {
        console.log(`ID: ${h.id} | Name: ${h.name} | Updated: ${h.updatedAt.toISOString()}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
