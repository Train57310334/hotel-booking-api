const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOwners() {
    const hotels = await prisma.hotel.findMany({ include: { owner: true } });
    hotels.forEach(h => {
        console.log(`Hotel: ${h.name} | ID: ${h.id}`);
        if (h.owner) {
            console.log(`  --> Owner: ${h.owner.name} (${h.owner.email})`);
        } else {
            console.log(`  --> Owner: NULL`);
        }
    });

    // Let's also check RoleAssignments
    const assignments = await prisma.roleAssignment.findMany({
        where: { role: 'hotel_admin' },
        include: { user: true, hotel: true }
    });

    console.log('\n--- Role Assignments (hotel_admin) ---');
    assignments.forEach(a => {
        console.log(`Hotel: ${a.hotel?.name} | Admin: ${a.user?.name} (${a.user?.email})`);
    });
}

checkOwners().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
