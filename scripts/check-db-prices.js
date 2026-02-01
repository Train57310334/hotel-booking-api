const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPrices() {
    const roomTypes = await prisma.roomType.findMany({
        take: 5,
        include: {
            ratePlans: true
        }
    });

    console.log("Checking Room Prices:");
    roomTypes.forEach(rt => {
        console.log(`Room: ${rt.name}, BasePrice: ${rt.basePrice}`);
        rt.ratePlans.forEach(rp => {
            console.log(`  - Plan: ${rp.name}, PriceAdjustment: ${rp.priceAdjustment || 'N/A'}`);
        });
    });
}

checkPrices()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
