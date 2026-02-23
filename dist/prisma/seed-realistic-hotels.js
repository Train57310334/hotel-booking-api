"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const cities = ['Bangkok', 'Phuket', 'Chiang Mai', 'Pattaya', 'Krabi', 'Samui', 'Hua Hin'];
const hotelTypes = ['Resort', 'Hotel', 'Villas', 'Lodge', 'Suites'];
const amenitiesList = ['wifi', 'pool', 'gym', 'spa', 'bar', 'restaurant', 'parking', 'beach', 'shuttle'];
const hotelImages = [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200',
    'https://images.unsplash.com/photo-1571896349842-6e5c48dc52e5?q=80&w=1200',
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=1200',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=1200',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=1200',
    'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=1200',
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=1200',
    'https://images.unsplash.com/photo-1455587734955-081b22074882?q=80&w=1200',
    'https://images.unsplash.com/photo-1564501049412-61c2a3083791?q=80&w=1200',
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=1200',
    'https://images.unsplash.com/photo-1551918120-9d5946a5163e?q=80&w=1200',
    'https://images.unsplash.com/photo-1596436889106-be35e843f974?q=80&w=1200',
    'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?q=80&w=1200',
    'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?q=80&w=1200',
    'https://images.unsplash.com/photo-1610641818989-c2051b5e2cfd?q=80&w=1200',
    'https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=1200',
    'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1200',
    'https://images.unsplash.com/photo-1561501900-3701fa6a0864?q=80&w=1200',
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=1200',
    'https://images.unsplash.com/photo-1591088398332-8a7791972843?q=80&w=1200'
];
async function main() {
    console.log('Clearing existing data...');
    const hotelsData = Array.from({ length: 20 }).map((_, i) => {
        const city = cities[i % cities.length];
        return {
            name: `${city} ${hotelTypes[i % hotelTypes.length]} ${i + 1}`,
            description: `Experience the best of ${city} in our wonderful hotel. Perfect for business and leisure travelers.`,
            city: city,
            country: 'TH',
            imageUrl: hotelImages[i % hotelImages.length],
            amenities: amenitiesList.sort(() => 0.5 - Math.random()).slice(0, 5),
            price: 1500 + Math.floor(Math.random() * 5000)
        };
    });
    for (const h of hotelsData) {
        console.log(`Creating ${h.name}...`);
        const hotel = await prisma.hotel.create({
            data: {
                name: h.name,
                description: h.description,
                city: h.city,
                country: h.country,
                imageUrl: h.imageUrl,
                amenities: h.amenities
            }
        });
        const roomTypes = [
            { name: 'Superior Room', size: 30, price: h.price, bed: '1 Queen' },
            { name: 'Deluxe Room', size: 45, price: h.price + 1000, bed: '1 King' },
            { name: 'Suite', size: 70, price: h.price + 3000, bed: '1 King + Sofa' }
        ];
        for (const rt of roomTypes) {
            const roomType = await prisma.roomType.create({
                data: {
                    hotelId: hotel.id,
                    name: rt.name,
                    sizeSqm: rt.size,
                    bedConfig: rt.bed,
                    basePrice: rt.price,
                    maxAdults: rt.name === 'Suite' ? 3 : 2,
                    maxChildren: rt.name === 'Suite' ? 2 : 1,
                    description: `A spacious ${rt.name.toLowerCase()} with modern amenities and city views.`,
                    images: [
                        `https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=600&auto=format&fit=crop`,
                        `https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=600&auto=format&fit=crop`
                    ],
                    amenities: ['wifi', 'ac', 'tv', 'safe']
                }
            });
            await prisma.ratePlan.create({
                data: {
                    hotelId: hotel.id,
                    roomTypeId: roomType.id,
                    name: 'Room Only',
                    includesBreakfast: false,
                    cancellationRule: 'Non-refundable'
                }
            });
            await prisma.ratePlan.create({
                data: {
                    hotelId: hotel.id,
                    roomTypeId: roomType.id,
                    name: 'Bed & Breakfast',
                    includesBreakfast: true,
                    cancellationRule: 'Free cancellation'
                }
            });
        }
        await prisma.review.create({
            data: {
                hotel: { connect: { id: hotel.id } },
                user: { connect: { email: 'demo@hotel.com' } },
                rating: 4 + Math.floor(Math.random() * 2),
                comment: 'Great stay! The staff was wonderful and the location is perfect.',
                status: 'approved'
            }
        }).catch(() => { });
    }
    console.log('Seeding completed!');
}
main()
    .catch(e => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-realistic-hotels.js.map