"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding fresh data for Admin Dashboard...');
    const email = 'admin@bookingkub.com';
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        const passwordHash = await bcrypt.hash('admin1234', 10);
        user = await prisma.user.create({
            data: { email, passwordHash, name: 'Super Admin', roles: ['user', 'hotel_admin', 'platform_admin'] },
        });
    }
    let hotel = await prisma.hotel.findFirst();
    if (!hotel) {
        hotel = await prisma.hotel.create({
            data: {
                name: 'Grand Hyatt Erawan',
                description: 'Luxury 5-star hotel in Bangkok',
                city: 'Bangkok', country: 'TH',
                imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200'
            }
        });
    }
    let roomType = await prisma.roomType.findFirst({ where: { hotelId: hotel.id } });
    if (!roomType) {
        roomType = await prisma.roomType.create({
            data: { hotelId: hotel.id, name: 'Deluxe Suite', bedConfig: '1 King', sizeSqm: 45, amenities: ['wifi', 'ac', 'bath'] }
        });
    }
    let ratePlan = await prisma.ratePlan.findFirst({ where: { roomTypeId: roomType.id } });
    if (!ratePlan) {
        ratePlan = await prisma.ratePlan.create({
            data: { hotelId: hotel.id, roomTypeId: roomType.id, name: 'Best Flexible Rate', includesBreakfast: true }
        });
    }
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    for (let i = 0; i < 30; i++) {
        const d = new Date(startOfMonth);
        d.setDate(d.getDate() + i);
        await prisma.inventoryCalendar.upsert({
            where: { roomTypeId_date: { roomTypeId: roomType.id, date: d } },
            update: { allotment: 20 },
            create: { roomTypeId: roomType.id, date: d, allotment: 20 }
        });
    }
    const rooms = [];
    for (let i = 101; i <= 110; i++) {
        const r = await prisma.room.create({
            data: { roomTypeId: roomType.id }
        });
        rooms.push(r);
    }
    const statuses = ['confirmed', 'confirmed', 'confirmed', 'pending', 'cancelled', 'checked_in', 'checked_out'];
    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    for (let i = 0; i < 50; i++) {
        const daysOffset = randomInt(-100, 30);
        const bookingDate = new Date();
        bookingDate.setDate(bookingDate.getDate() + daysOffset);
        const checkIn = new Date(bookingDate);
        checkIn.setDate(checkIn.getDate() + randomInt(1, 14));
        const checkOut = new Date(checkIn);
        checkOut.setDate(checkOut.getDate() + randomInt(1, 5));
        const room = rooms[Math.floor(Math.random() * rooms.length)];
        await prisma.booking.create({
            data: {
                userId: user.id,
                hotelId: hotel.id,
                roomTypeId: roomType.id,
                ratePlanId: ratePlan.id,
                roomId: room.id,
                checkIn,
                checkOut,
                guestsAdult: randomInt(1, 3),
                guestsChild: randomInt(0, 2),
                totalAmount: randomInt(2000, 15000),
                status: statuses[Math.floor(Math.random() * statuses.length)],
                leadName: `Guest ${i + 1}`,
                leadEmail: `guest${i + 1}@example.com`,
                leadPhone: '0812345678',
                specialRequests: Math.random() > 0.7 ? 'Late check-in' : null,
                createdAt: bookingDate,
            }
        }).catch(e => console.error(`Failed to seed booking ${i}:`, e.message));
    }
    console.log('✅ Fresh Seed Data Created!');
}
main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
//# sourceMappingURL=seed-admin.js.map