
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'newowner@hotel.com';
    const password = '123';

    console.log(`Creating fresh user ${email}...`);

    // Cleanup old test data
    await prisma.roleAssignment.deleteMany({ where: { user: { email } } });
    await prisma.user.deleteMany({ where: { email } });

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
        data: {
            email,
            passwordHash: hashedPassword,
            name: 'New Owner',
            roles: ['hotel_admin'] // Pre-approve as admin but NO HOTEL assigned yet
        }
    });

    console.log(`✅ User Created: ${email} / ${password}`);
    console.log(`ℹ️ This user has NO hotel. Login should redirect to /admin/setup`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
