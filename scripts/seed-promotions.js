const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const today = new Date();
    const nextYear = new Date();
    nextYear.setFullYear(today.getFullYear() + 1);

    const promos = [
        {
            code: 'WELCOME10',
            type: 'percent',
            value: 10,
            startDate: today,
            endDate: nextYear,
            conditions: '10% discount for new customers'
        },
        {
            code: 'SAVE500',
            type: 'fixed',
            value: 500,
            startDate: today,
            endDate: nextYear,
            conditions: '500 THB off for bookings over 2000 THB'
        }
    ];

    for (const p of promos) {
        const existing = await prisma.promotion.findUnique({ where: { code: p.code } });
        if (!existing) {
            await prisma.promotion.create({ data: p });
            console.log(`Created Promotion: ${p.code}`);
        } else {
            console.log(`Promotion ${p.code} already exists.`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
