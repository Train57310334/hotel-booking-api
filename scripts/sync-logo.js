const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Finding a hotel with a logo...');

    // Find the first hotel that has a logo
    const hotel = await prisma.hotel.findFirst({
        where: {
            logoUrl: { not: null }
        }
    });

    if (!hotel) {
        console.log('No hotel with a logo found.');
        return;
    }

    console.log(`Found hotel: ${hotel.name} with logo: ${hotel.logoUrl}`);

    console.log('Updating System Settings...');

    // Upsert the logoUrl into SystemSetting
    await prisma.systemSetting.upsert({
        where: { key: 'logoUrl' },
        update: { value: hotel.logoUrl },
        create: {
            key: 'logoUrl',
            value: hotel.logoUrl,
            category: 'branding'
        }
    });

    // Also update siteName if needed
    await prisma.systemSetting.upsert({
        where: { key: 'siteName' },
        update: { value: hotel.name },
        create: {
            key: 'siteName',
            value: hotel.name,
            category: 'branding'
        }
    });

    console.log('System Settings Updated Successfully!');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
