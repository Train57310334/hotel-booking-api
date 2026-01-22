const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Room Types...');

    // 1. Get or Create a Hotel (Assuming at least one hotel exists, or create one)
    let hotel = await prisma.hotel.findFirst();
    if (!hotel) {
        console.log('No hotel found. Creating default hotel...');
        hotel = await prisma.hotel.create({
            data: {
                name: 'The Grand Seaside Hotel',
                description: 'Luxury stay by the ocean.',
                address: '123 Beach Road',
                city: 'Pattaya',
                country: 'Thailand'
            }
        });
    }

    // Define Mock Data
    const roomTypes = [
        {
            name: 'Standard King Room',
            description: 'A cozy, modern standard hotel room with a king-size bed, warm lighting, wooden accents, and a large window with a garden view. Perfect for couples.',
            basePrice: 1500,
            bedConfig: 'King Bed',
            sizeSqm: 28,
            maxAdults: 2,
            maxChildren: 0,
            amenities: ['Wi-Fi', 'Air Conditioning', 'TV', 'Hair Dryer'],
            images: ['/brain/67340cd6-56e5-4fca-b1d7-452afd86c482/standard_room_king_1769106655169.png'],
            hotelId: hotel.id
        },
        {
            name: 'Deluxe Twin Room',
            description: 'A spacious deluxe hotel room with two twin beds, blue and white color scheme, modern furniture, city view from high floor, soft daylight. Ideal for friends or family.',
            basePrice: 2200,
            bedConfig: 'Twin Beds',
            sizeSqm: 35,
            maxAdults: 2,
            maxChildren: 1,
            amenities: ['Wi-Fi', 'Air Conditioning', 'TV', 'Minibar', 'Safe', 'Desk'],
            images: ['/brain/67340cd6-56e5-4fca-b1d7-452afd86c482/deluxe_room_twin_1769106674198.png'],
            hotelId: hotel.id
        },
        {
            name: 'Grand Executive Suite',
            description: 'A luxurious executive hotel suite with a separate living area, large L-shaped sofa, king bed in background, marble floor, elegant chandelier, panoramic city night view.',
            basePrice: 5500,
            bedConfig: 'King Bed',
            sizeSqm: 65,
            maxAdults: 3,
            maxChildren: 2,
            amenities: ['Wi-Fi', 'Air Conditioning', 'TV', 'Minibar', 'Bathtub', 'Balcony', 'Safe', 'Hair Dryer', 'Desk'],
            images: ['/brain/67340cd6-56e5-4fca-b1d7-452afd86c482/executive_suite_luxury_1769106691450.png'],
            hotelId: hotel.id
        }
    ];

    // Insert Data
    for (const type of roomTypes) {
        await prisma.roomType.create({
            data: type
        });
        console.log(`Created: ${type.name}`);
    }

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
