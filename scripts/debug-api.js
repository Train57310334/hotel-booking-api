const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1. Check DB ownership
    const featured = await prisma.roomType.findMany({
        where: { isFeatured: true },
        include: { hotel: true }
    });
    console.log('--- DB FEATURED ROOMS ---');
    featured.forEach(r => {
        console.log(`Room: ${r.name}, Hotel: ${r.hotel.name} (${r.hotel.id})`);
    });

    // 2. Check API
    console.log('\n--- API RESPONSE ---');
    try {
        const res = await fetch('http://localhost:3001/api/hotels');
        const hotels = await res.json();
        if (hotels.length > 0) {
            const first = hotels[0];
            console.log(`First Hotel in API: ${first.name} (${first.id})`);
            console.log(`Room Types in First Hotel: ${first.roomTypes?.length}`);
            first.roomTypes?.forEach(rt => {
                console.log(`- ${rt.name}: isFeatured=${rt.isFeatured}`);
            });
        } else {
            console.log('No hotels returned by API');
        }
    } catch (e) {
        console.error('API Fetch failed:', e.message);
    }
}

main().finally(() => prisma.$disconnect());
