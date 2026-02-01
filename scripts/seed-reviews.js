const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Reviews...');

    // 1. Find a hotel
    const hotel = await prisma.hotel.findFirst();
    if (!hotel) {
        console.error('❌ No hotel found. Please run seed-hotels.js first.');
        process.exit(1);
    }

    // 2. Find some users
    const users = await prisma.user.findMany({ take: 3 });
    if (users.length === 0) {
        console.error('❌ No users found.');
        process.exit(1);
    }

    // 3. Create Reviews
    const reviews = [
        {
            hotelId: hotel.id,
            userId: users[0].id,
            rating: 5,
            comment: "Amazing stay! The room was spotless and the view was incredible.",
            status: 'approved',
            createdAt: new Date('2024-01-15')
        },
        {
            hotelId: hotel.id,
            userId: users[1] ? users[1].id : users[0].id,
            rating: 4,
            comment: "Great location, but breakfast could be better.",
            status: 'approved',
            createdAt: new Date('2024-02-10')
        },
        {
            hotelId: hotel.id,
            userId: users[2] ? users[2].id : users[0].id,
            rating: 5,
            comment: "Staff were super helpful. Highly recommended!",
            status: 'approved',
            createdAt: new Date('2024-02-20')
        },
        {
            hotelId: hotel.id,
            userId: users[0].id,
            rating: 2,
            comment: "Too noisy at night.",
            status: 'rejected',
            createdAt: new Date('2024-01-05')
        }
    ];

    for (const r of reviews) {
        await prisma.review.create({ data: r });
    }

    console.log(`✅ Seeded ${reviews.length} reviews (3 approved, 1 rejected).`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
