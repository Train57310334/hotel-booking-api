import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@bookingkub.com';
  const passwordRaw = 'admin1234';
  const passwordHash = await bcrypt.hash(passwordRaw, 10);

  console.log(`Creating admin user: ${email}...`);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      roles: ['user', 'admin', 'platform_admin'], // Assign all high-level roles
      name: 'Super Admin'
    },
    create: {
      email,
      passwordHash,
      name: 'Super Admin',
      roles: ['user', 'admin', 'platform_admin']
    },
  });

  console.log(`Admin user created/updated successfully: ${user.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
