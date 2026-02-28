import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PACKAGE_LIMITS: Record<string, any> = {
  LITE: {
    maxRooms: 5,
    maxRoomTypes: 2,
    maxStaff: 1,
    hasPromotions: false,
    hasOnlinePayment: false,
  },
  PRO: {
    maxRooms: 50,
    maxRoomTypes: 10,
    maxStaff: 5,
    hasPromotions: true,
    hasOnlinePayment: true,
  },
  ENTERPRISE: {
    maxRooms: 9999, // Unlimited
    maxRoomTypes: 9999,
    maxStaff: 9999,
    hasPromotions: true,
    hasOnlinePayment: true,
  }
};

async function main() {
  console.log('Starting Backfill of Hotel Plan Limits...');

  const hotels = await prisma.hotel.findMany();

  for (const hotel of hotels) {
    const pkgName = hotel.package || 'LITE';
    const limits = PACKAGE_LIMITS[pkgName] || PACKAGE_LIMITS['LITE'];

    await prisma.hotel.update({
      where: { id: hotel.id },
      data: limits
    });
    
    console.log(`Updated Hotel: ${hotel.name} to ${pkgName} limits.`);
  }

  console.log('Backfill completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
