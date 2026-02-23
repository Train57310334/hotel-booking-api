"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding missing RatePlans for RoomTypes...');
    const roomTypes = await prisma.roomType.findMany({
        include: { ratePlans: true }
    });
    let createdCount = 0;
    for (const rt of roomTypes) {
        if (rt.ratePlans.length === 0) {
            console.log(`RoomType '${rt.name}' (ID: ${rt.id}) is missing a RatePlan. Creating one...`);
            await prisma.ratePlan.create({
                data: {
                    hotelId: rt.hotelId,
                    roomTypeId: rt.id,
                    name: 'Standard Rate',
                    cancellationRule: 'Free cancellation up to 24h',
                    includesBreakfast: false
                }
            });
            createdCount++;
        }
    }
    console.log(`Done! Created ${createdCount} RatePlans.`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-rate-plans.js.map