const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const room = await prisma.roomType.findFirst({
        where: { isFeatured: true },
        include: { ratePlans: true }
    });
    console.log(`Room: ${room.name}`);
    console.log(`Base Price: ${room.basePrice}`);
    console.log(`Rate Plans: ${room.ratePlans.length}`);
}

main().finally(() => prisma.$disconnect());
