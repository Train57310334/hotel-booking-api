"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🔥 HARD RESET: Wiping ENTIRE Database...');
    console.log('Deleting Payments...');
    await prisma.payment.deleteMany({});
    console.log('Deleting Expenses...');
    await prisma.expense.deleteMany({});
    console.log('Deleting Role Assignments...');
    await prisma.roleAssignment.deleteMany({});
    console.log('Deleting Bookings...');
    await prisma.booking.deleteMany({});
    console.log('Deleting Reviews...');
    await prisma.review.deleteMany({});
    console.log('Deleting Rate Overrides & Plans...');
    await prisma.rateOverride.deleteMany({});
    await prisma.ratePlan.deleteMany({});
    console.log('Deleting Inventory...');
    await prisma.inventoryCalendar.deleteMany({});
    console.log('Deleting Physical Rooms...');
    await prisma.room.deleteMany({});
    console.log('Deleting Room Types...');
    await prisma.roomType.deleteMany({});
    console.log('Deleting Promotions...');
    await prisma.promotion.deleteMany({});
    console.log('Deleting Hotels...');
    await prisma.hotel.deleteMany({});
    console.log('Deleting Users...');
    await prisma.user.deleteMany({});
    console.log('✨ System is completely clean. Ready for new User Registration.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=hard-reset.js.map