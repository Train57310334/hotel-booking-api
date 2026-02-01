
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const bookingId = 'cmkwtbh140002f7no50l7xohp';
    console.log(`Searching for booking: ${bookingId}...`);

    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { hotel: true }
    });

    if (!booking) {
        console.log('❌ Booking NOT FOUND in database.');
    } else {
        console.log('✅ Booking FOUND:');
        console.log(`- ID: ${booking.id}`);
        console.log(`- Hotel ID: ${booking.hotelId}`);
        console.log(`- Hotel Name: ${booking.hotel ? booking.hotel.name : 'N/A'}`);
        console.log(`- Status: ${booking.status}`);
        console.log(`- Guest: ${booking.leadName}`);
    }

    // Also list all Admin users and their assigned hotels
    console.log('\n--- Admin Users & Assignments ---');
    const admins = await prisma.user.findMany({
        where: { roles: { has: 'hotel_admin' } },
        include: { roleAssignments: true }
    });

    admins.forEach(u => {
        console.log(`User: ${u.email}`);
        u.roleAssignments.forEach(r => {
            console.log(`  -> Assigned to Hotel: ${r.hotelId}`);
        });
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
