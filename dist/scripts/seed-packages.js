"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const plans = [
    {
        id: 'LITE',
        name: 'LITE',
        price: 0,
        priceLabel: 'Free',
        period: 'Forever',
        description: 'Perfect for small guesthouses and startups.',
        icon: 'Building2',
        color: 'slate',
        features: [
            '1 Property',
            'Up to 10 Rooms',
            'Direct Booking Page',
            'Basic Calendar',
            'Manual Payments',
            'Email Support'
        ],
        missingFeatures: [
            'No Promotion Codes',
            'No Online Payment Gateway',
            'No Channel Manager (OTA)'
        ],
        isPopular: false,
        maxRooms: 10,
        maxRoomTypes: 2,
        maxStaff: 1,
        hasPromotions: false,
        hasOnlinePayment: false
    },
    {
        id: 'PRO',
        name: 'PRO',
        price: 1500,
        priceLabel: '฿1,500',
        period: '/month',
        description: 'Everything you need for a growing hotel business.',
        icon: 'Zap',
        color: 'emerald',
        features: [
            'Up to 50 Rooms',
            'Channel Manager Sync',
            'Automated Payments (Stripe/Omise)',
            'Advanced Analytics & Reports',
            'Multiple Staff Accounts',
            'Priority Support 24/7'
        ],
        missingFeatures: [],
        isPopular: true,
        maxRooms: 50,
        maxRoomTypes: 10,
        maxStaff: 5,
        hasPromotions: true,
        hasOnlinePayment: true
    },
    {
        id: 'ENTERPRISE',
        name: 'ENTERPRISE',
        price: 5000,
        priceLabel: '฿5,000',
        period: '/month',
        description: 'For chains and large scale operations.',
        icon: 'Crown',
        color: 'indigo',
        features: [
            'Unlimited Rooms',
            'Multi-Property Management',
            'API Access',
            'Custom Branding (White Label)',
            'Dedicated Account Manager',
            'On-site Training',
            'SLA Guarantee'
        ],
        missingFeatures: [],
        isPopular: false,
        maxRooms: 9999,
        maxRoomTypes: 9999,
        maxStaff: 9999,
        hasPromotions: true,
        hasOnlinePayment: true
    }
];
async function main() {
    console.log('Seeding subscription packages...');
    for (const plan of plans) {
        await prisma.subscriptionPlan.upsert({
            where: { id: plan.id },
            update: plan,
            create: plan,
        });
        console.log(`Upserted plan: ${plan.id}`);
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
//# sourceMappingURL=seed-packages.js.map