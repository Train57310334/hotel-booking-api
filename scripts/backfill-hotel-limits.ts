import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PACKAGE_LIMITS: Record<string, any> = {
  LITE: {
    maxRooms: 2,
    maxRoomTypes: 1,
    maxStaff: 1,
    hasPromotions: false,
    hasOnlinePayment: false,
    hasSeo: false,
    hasCustomDomain: false,
    hasAdvancedAnalytics: false,
  },
  PRO: {
    maxRooms: 30,
    maxRoomTypes: 5,
    maxStaff: 5,
    hasPromotions: true,
    hasOnlinePayment: true,
    hasSeo: false,
    hasCustomDomain: false,
    hasAdvancedAnalytics: false,
  },
  ENTERPRISE: {
    maxRooms: 9999, // Unlimited
    maxRoomTypes: 9999,
    maxStaff: 9999,
    hasPromotions: true,
    hasOnlinePayment: true,
    hasSeo: true,
    hasCustomDomain: true,
    hasAdvancedAnalytics: true,
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
