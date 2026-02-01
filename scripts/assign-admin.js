
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const hotelId = 'cmkmrv5y50001m387ip82mfst'; // Bangkok Central Hotel
    const targetEmails = ['demo@hotel.com', 'tony@gmail.com', 'watt@gmail.com', 'train@gmail.com'];

    console.log(`Assigning admins to Hotel ID: ${hotelId}...`);

    for (const email of targetEmails) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            console.log(`Skipping ${email} (Not found)`);
            continue;
        }

        // Check if assignment exists
        const exists = await prisma.roleAssignment.findFirst({
            where: { userId: user.id, hotelId: hotelId, role: 'hotel_admin' }
        });

        if (exists) {
            console.log(`- ${email} is already assigned.`);
        } else {
            await prisma.roleAssignment.create({
                data: {
                    userId: user.id,
                    hotelId: hotelId,
                    role: 'hotel_admin'
                }
            });
            console.log(`✅ Assigned ${email} to hotel.`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
