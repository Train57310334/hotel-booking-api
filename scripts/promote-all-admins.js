const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users.`);

    for (const u of users) {
        const roles = u.roles || [];
        if (!roles.includes('hotel_admin')) {
            roles.push('hotel_admin');
            if (!roles.includes('platform_admin')) roles.push('platform_admin'); // Give full power for dev

            await prisma.user.update({
                where: { id: u.id },
                data: { roles }
            });
            console.log(`Promoted user ${u.email} (${u.name}) to [${roles.join(', ')}]`);
        } else {
            console.log(`User ${u.email} is already admin.`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
