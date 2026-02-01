
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'newowner@hotel.com';
    const password = '123';

    console.log(`🔍 Debugging Login for ${email}...`);

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            console.error('❌ User NOT FOUND in database!');
            return;
        }

        console.log(`✅ User found: ID=${user.id}`);
        console.log(`🔐 Stored Hash: ${user.passwordHash.substring(0, 10)}...`);

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (isValid) {
            console.log(`✅ Password '123' is VALID.`);
        } else {
            console.error(`❌ Password '123' is INVALID against stored hash.`);

            // Try re-hashing
            const newHash = await bcrypt.hash(password, 10);
            console.log(`🔄 Re-hashing '123' -> ${newHash}`);

            // Verify new hash immediately
            const check = await bcrypt.compare(password, newHash);
            console.log(`🔄 Self-check new hash: ${check}`);

            // Update DB with new hash
            console.log(`⚠️ Updating user password in DB to new hash...`);
            await prisma.user.update({
                where: { email },
                data: { passwordHash: newHash }
            });
            console.log(`✅ Password updated. Try login again.`);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
