const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addInventory() {
    const roomTypeId = 'cml35okne000h12d2d120sja3'; // Pattaya Standard Room
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log('--- Adding Inventory ---');

    // Add inventory for next 30 days
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);

        await prisma.inventoryCalendar.upsert({
            where: {
                roomTypeId_date: {
                    roomTypeId,
                    date
                }
            },
            update: { allotment: 10, stopSale: false },
            create: {
                roomTypeId,
                date,
                allotment: 10,
                stopSale: false
            }
        });
    }
    console.log('✅ Inventory Added (10 rooms/day) for next 30 days');
}

addInventory()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
