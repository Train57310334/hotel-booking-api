const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mocking the Service logic roughly or just inspecting the data that would drive it
async function main() {
    const hotelId = 'cmkmqbn16000113bj400bdzme'; // The "Good" hotel

    const hotel = await prisma.hotel.findUnique({
        where: { id: hotelId },
        include: {
            roomTypes: {
                include: {
                    inventory: true,
                    ratePlans: true,
                    overrides: true
                }
            }
        }
    });

    console.log('Hotel:', hotel.name);
    console.log('Room Types found:', hotel.roomTypes.length);

    hotel.roomTypes.forEach(rt => {
        console.log(`\n[Room] ${rt.name} (${rt.id})`);
        console.log(`  MaxAdults: ${rt.maxAdults}`);
        console.log(`  Inventory Count: ${rt.inventory.length}`);

        // Simulate Check logic
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const inv = rt.inventory.find(i => new Date(i.date).getTime() === today.getTime());

        console.log(`  Inv Today: ${inv ? `Allotment=${inv.allotment}, StopSale=${inv.stopSale}` : 'MISSING'}`);

        // Simulate Availability Boolean
        const isAvailable = (inv && inv.allotment > 0 && !inv.stopSale);
        console.log(`  -> Calculated Availability: ${isAvailable}`);
    });
}

main().finally(() => prisma.$disconnect());
