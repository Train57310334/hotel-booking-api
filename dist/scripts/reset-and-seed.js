"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🧹 Cleaning up database...');
    await prisma.payment.deleteMany({});
    await prisma.expense.deleteMany({});
    await prisma.roleAssignment.deleteMany({});
    console.log('✅ Deleted Payments, Expenses, RoleAssignments');
    await prisma.booking.deleteMany({});
    console.log('✅ Deleted all Bookings');
    await prisma.review.deleteMany({});
    console.log('✅ Deleted all Reviews');
    await prisma.inventoryCalendar.deleteMany({});
    await prisma.rateOverride.deleteMany({});
    await prisma.ratePlan.deleteMany({});
    console.log('✅ Deleted overrides & rate plans');
    await prisma.room.deleteMany({});
    console.log('✅ Deleted all Physical Rooms');
    await prisma.roomType.deleteMany({});
    console.log('✅ Deleted all Room Types');
    await prisma.promotion.deleteMany({});
    await prisma.hotel.deleteMany({});
    console.log('✅ Deleted all Hotels');
    console.log('creating hotel...');
    const hotel = await prisma.hotel.create({
        data: {
            name: 'BookingKub Hotel',
            address: '123 Bangkok',
            description: 'Luxury hotel in the heart of Bangkok',
            amenities: ['Pool', 'Gym', 'Wifi']
        }
    });
    const hotelId = hotel.id;
    const firstUser = await prisma.user.findFirst();
    if (firstUser) {
        await prisma.roleAssignment.create({
            data: {
                userId: firstUser.id,
                hotelId: hotel.id,
                role: 'hotel_admin'
            }
        });
        if (!firstUser.roles.includes('hotel_admin')) {
            await prisma.user.update({
                where: { id: firstUser.id },
                data: { roles: { push: 'hotel_admin' } }
            });
        }
        console.log(`✅ Assigned User ${firstUser.email} to ${hotel.name}`);
    }
    console.log('🌱 Seeding fresh data...');
    const types = [
        {
            name: 'Deluxe King Room',
            description: 'Experience ultimate comfort in our Deluxe King Room. Featuring a spacious layout, modern amenities, and a breathtaking city view, this room is perfect for both business and leisure travelers. Enjoy a restful sleep on our premium King-sized mattress.',
            basePrice: 2500,
            bedConfig: 'King Bed',
            sizeSqm: 35,
            maxAdults: 2,
            maxChildren: 1,
            hotelId: hotelId,
            images: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070&auto=format&fit=crop'],
            amenities: ['Wi-Fi', 'Air Conditioning', 'TV', 'Minibar', 'Safe', 'Desk'],
            isFeatured: true
        },
        {
            name: 'Standard Twin Room',
            description: 'Our Standard Twin Room offers a cozy and practical stay for friends or colleagues. Equipped with two comfortable twin beds and all essential amenities to ensure a pleasant stay.',
            basePrice: 1800,
            bedConfig: 'Twin Beds',
            sizeSqm: 28,
            maxAdults: 2,
            maxChildren: 0,
            hotelId: hotelId,
            images: ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=2074&auto=format&fit=crop'],
            amenities: ['Wi-Fi', 'Air Conditioning', 'TV', 'Hair Dryer'],
            isFeatured: false
        },
        {
            name: 'Executive Suite',
            description: 'Indulge in luxury with our Executive Suite. This expansive suite features a separate living area, a luxurious bathtub, and panoramic views. Perfect for special occasions or extended stays.',
            basePrice: 5500,
            bedConfig: 'King Bed',
            sizeSqm: 65,
            maxAdults: 3,
            maxChildren: 2,
            hotelId: hotelId,
            images: ['https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=2070&auto=format&fit=crop'],
            amenities: ['Wi-Fi', 'Air Conditioning', 'TV', 'Minibar', 'Bathtub', 'Balcony', 'Safe', 'Desk', 'Coffee Machine'],
            isFeatured: true
        }
    ];
    for (const t of types) {
        const createdType = await prisma.roomType.create({ data: t });
        console.log(`Created Type: ${t.name}`);
        for (let i = 1; i <= 5; i++) {
            const prefix = (types.indexOf(t) + 1) * 100;
            await prisma.room.create({
                data: {
                    roomNumber: (prefix + i).toString(),
                    roomTypeId: createdType.id
                }
            });
        }
        console.log(`  > Added 5 physical rooms`);
        const standardPlan = await prisma.ratePlan.create({
            data: {
                hotelId: hotelId,
                roomTypeId: createdType.id,
                name: 'Standard Rate',
                cancellationRule: 'Free cancellation up to 24 hours before check-in',
                includesBreakfast: false,
                adultPricePolicy: 'standard',
            }
        });
        const breakfastPlan = await prisma.ratePlan.create({
            data: {
                hotelId: hotelId,
                roomTypeId: createdType.id,
                name: 'Bed & Breakfast',
                cancellationRule: 'Non-refundable',
                includesBreakfast: true,
                adultPricePolicy: 'standard + 300'
            }
        });
        console.log(`  > Added Rate Plans: Standard, Breakfast`);
        const today = new Date();
        const inventoryData = [];
        for (let d = 0; d < 90; d++) {
            const date = new Date(today);
            date.setDate(date.getDate() + d);
            inventoryData.push({
                roomTypeId: createdType.id,
                date: date,
                allotment: 5,
                stopSale: false,
                minStay: 1
            });
        }
        await prisma.inventoryCalendar.createMany({ data: inventoryData });
        console.log(`  > Seeded 90 days inventory`);
    }
    await prisma.promotion.create({
        data: {
            code: 'WELCOME2026',
            type: 'percent',
            value: 15,
            startDate: new Date(),
            endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            hotelId: hotelId,
            conditions: 'New users only'
        }
    });
    console.log('✅ Added Promotion: WELCOME2026');
    await prisma.review.createMany({
        data: [
            { hotelId, userId: (await prisma.user.findFirst()).id, rating: 5, comment: 'Amazing stay! The room was spotless and the view was incredible.', status: 'approved' },
            { hotelId, userId: (await prisma.user.findFirst()).id, rating: 4, comment: 'Great location, but breakfast could be better.', status: 'approved' },
            { hotelId, userId: (await prisma.user.findFirst()).id, rating: 5, comment: 'Staff were super helpful. Highly recommended!', status: 'approved' }
        ]
    });
    console.log('✅ Added 3 Reviews');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=reset-and-seed.js.map