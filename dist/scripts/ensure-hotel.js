"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    try {
        const count = await prisma.hotel.count();
        console.log(`Hotel Count: ${count}`);
        if (count === 0) {
            console.log('No hotels found. Creating one...');
            await prisma.hotel.create({
                data: {
                    name: 'The Grand User Hotel',
                    description: 'A place for the user to see the new design.',
                    city: 'Bangkok',
                    country: 'TH',
                    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200',
                    amenities: ['wifi', 'pool'],
                    roomTypes: {
                        create: {
                            name: 'Deluxe Room',
                            sizeSqm: 45,
                            basePrice: 3500,
                            bedConfig: 'King',
                            maxAdults: 2,
                            maxChildren: 1,
                            description: 'Luxury room with sea view',
                            images: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32'],
                            amenities: ['wifi', 'ac']
                        }
                    }
                }
            });
            console.log('Created demo hotel.');
        }
    }
    catch (e) {
        console.error(e);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=ensure-hotel.js.map