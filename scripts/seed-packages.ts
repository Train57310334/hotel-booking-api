import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const packages = [
    {
        name: 'LITE',
        price: 0,
        priceLabel: 'Free',
        period: 'Forever',
        description: 'Perfect for small guesthouses or testing the platform.',
        features: [
            'Up to 2 Rooms',
            '1 Room Type',
            '1 Staff Account',
            'Basic Dashboard',
            'Manual Bookings'
        ],
        missingFeatures: [
            'Online Payments (Stripe/Omise)',
            'Promotions & Discounts',
            'Advanced Analytics / SEO',
        ],
        isPopular: false,
        color: 'slate',
        icon: 'Home',
        maxRooms: 2,
        maxRoomTypes: 1,
        maxStaff: 1,
        hasPromotions: false,
        hasOnlinePayment: false,
        hasSeo: false,
        hasCustomDomain: false,
        hasAdvancedAnalytics: false,
    },
    {
        name: 'PRO',
        price: 1500,
        priceLabel: '฿1,500',
        period: '/month',
        description: 'Everything you need to run a professional hotel.',
        features: [
            'Up to 30 Rooms',
            'Up to 5 Room Types',
            'Up to 5 Staff Accounts',
            'Online Payments (Stripe/Omise)',
            'Promotions & Discount Codes',
            'Basic Analytics (GA4/Pixel)'
        ],
        missingFeatures: [
            'Custom Domain',
            'Advanced SEO Control',
            'Looker Studio Embedded'
        ],
        isPopular: true,
        color: 'emerald',
        icon: 'Zap',
        maxRooms: 30,
        maxRoomTypes: 5,
        maxStaff: 5,
        hasPromotions: true,
        hasOnlinePayment: true,
        hasSeo: false,
        hasCustomDomain: false,
        hasAdvancedAnalytics: false,
    },
    {
        name: 'ENTERPRISE',
        price: 5000,
        priceLabel: 'Custom',
        period: '/month',
        description: 'For large hotels and resorts needing unlimited scale.',
        features: [
            'Unlimited Rooms',
            'Unlimited Room Types',
            'Unlimited Staff Accounts',
            'All PRO Features',
            'Advanced SEO Control',
            'Custom Domain Integration',
            'Looker Studio Dashboard',
            'Priority 24/7 Support'
        ],
        missingFeatures: [],
        isPopular: false,
        color: 'indigo',
        icon: 'Building',
        maxRooms: 9999,
        maxRoomTypes: 9999,
        maxStaff: 9999,
        hasPromotions: true,
        hasOnlinePayment: true,
        hasSeo: true,
        hasCustomDomain: true,
        hasAdvancedAnalytics: true,
    }
];

async function main() {
    console.log('Seeding subscription packages...');
    for (const pkg of packages) {
        await prisma.subscriptionPlan.upsert({
            where: { name: pkg.name },
            update: pkg,
            create: pkg,
        });
        console.log(`Upserted plan: ${pkg.name}`);
    }
    console.log('Done!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
