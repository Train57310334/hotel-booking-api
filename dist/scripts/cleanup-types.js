"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const roomTypes = await prisma.roomType.findMany({
        include: {
            rooms: true,
            bookings: true
        }
    });
    console.log(`Found ${roomTypes.length} room types.`);
    let deletedCount = 0;
    for (const type of roomTypes) {
        if (type.rooms.length === 0 && type.bookings.length === 0) {
            console.log(`Deleting empty type: ${type.name} (${type.id})`);
            await prisma.inventoryCalendar.deleteMany({ where: { roomTypeId: type.id } });
            await prisma.rateOverride.deleteMany({ where: { roomTypeId: type.id } });
            await prisma.ratePlan.deleteMany({ where: { roomTypeId: type.id } });
            await prisma.roomType.delete({
                where: { id: type.id }
            });
            deletedCount++;
        }
    }
    console.log(`Deleted ${deletedCount} empty room types.`);
}
main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
//# sourceMappingURL=cleanup-types.js.map