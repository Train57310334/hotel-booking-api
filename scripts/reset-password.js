
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'demo@hotel.com';
    const newPassword = '123456';

    console.log(`Resetting password for ${email}...`);

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.log(`❌ User ${email} not found! Creating new user...`);
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.create({
            data: {
                email,
                passwordHash: hashedPassword,
                name: 'Demo Admin',
                roles: ['hotel_admin']
            }
        });
        console.log(`✅ Created user ${email} with password ${newPassword}`);
    } else {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { email },
            data: { passwordHash: hashedPassword }
        });
        console.log(`✅ Password updated for ${email} to ${newPassword}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
