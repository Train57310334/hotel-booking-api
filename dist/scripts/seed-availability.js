"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('📅 Seeding Availability (Inventory + Physical Rooms)...');
    const roomTypes = await prisma.roomType.findMany();
    console.log(`Found ${roomTypes.length} room types.`);
    if (roomTypes.length === 0) {
        console.log('No room types found! Run the main seed script first.');
        return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const future = new Date(today);
    future.setDate(future.getDate() + 90);
    for (const rt of roomTypes) {
        console.log(`Processing Inventory for: ${rt.name}`);
        for (let d = new Date(today); d < future; d.setDate(d.getDate() + 1)) {
            const dateForDb = new Date(d);
            await prisma.inventoryCalendar.upsert({
                where: {
                    roomTypeId_date: {
                        roomTypeId: rt.id,
                        date: dateForDb
                    }
                },
                update: {
                    allotment: { set: 20 },
                    stopSale: false
                },
                create: {
                    roomTypeId: rt.id,
                    date: dateForDb,
                    allotment: 20,
                    stopSale: false
                }
            });
        }
        const existingRooms = await prisma.room.count({
            where: { roomTypeId: rt.id }
        });
        if (existingRooms < 5) {
            console.log(`creating physical rooms for ${rt.name}...`);
            for (let i = 1; i <= 10; i++) {
                await prisma.room.create({
                    data: {
                        roomTypeId: rt.id,
                        roomNumber: `${rt.name.substring(0, 2).toUpperCase()}-${100 + i}`
                    }
                });
            }
        }
    }
    console.log('✅ Availability Fixed!');
}
main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
//# sourceMappingURL=seed-availability.js.map