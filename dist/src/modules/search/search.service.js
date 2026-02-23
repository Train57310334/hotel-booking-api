"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let SearchService = class SearchService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findHotelsByCity(city, checkIn, checkOut, minPrice, maxPrice, guests, adults, children, amenities) {
        const totalNeeded = (adults || 0) + (children || 0) || guests || 1;
        const where = {
            city: {
                contains: city || '',
                mode: 'insensitive'
            }
        };
        if (amenities && amenities.length > 0) {
            where.amenities = {
                hasEvery: amenities
            };
        }
        if (checkIn && checkOut) {
            where.roomTypes = {
                some: {
                    rooms: {
                        some: {
                            bookings: {
                                none: {
                                    OR: [
                                        {
                                            checkIn: { lt: new Date(checkOut) },
                                            checkOut: { gt: new Date(checkIn) }
                                        }
                                    ]
                                }
                            },
                            ...(totalNeeded ? { capacity: { gte: totalNeeded } } : {})
                        }
                    }
                }
            };
        }
        else if (totalNeeded) {
            where.roomTypes = {
                some: {
                    rooms: {
                        some: {
                            capacity: { gte: totalNeeded }
                        }
                    }
                }
            };
        }
        const hotels = await this.prisma.hotel.findMany({
            where,
            include: {
                reviews: {
                    where: { status: 'approved' },
                    select: {
                        id: true,
                        rating: true,
                        comment: true,
                        user: { select: { name: true } },
                        createdAt: true
                    },
                    take: 5,
                    orderBy: { createdAt: 'desc' }
                },
                roomTypes: {
                    include: {
                        rooms: {
                            include: {
                                bookings: true
                            }
                        }
                    }
                }
            }
        });
        const computed = hotels.map(h => {
            const flatPrices = h.roomTypes.flatMap(rt => rt.rooms.map((r, i) => 1200 + i * 600));
            const minP = flatPrices.length ? Math.min(...flatPrices) : 0;
            return { ...h, minPrice: minP };
        });
        return computed.filter(h => {
            if (typeof minPrice === 'number' && h.minPrice < minPrice)
                return false;
            if (typeof maxPrice === 'number' && h.minPrice > maxPrice)
                return false;
            return true;
        });
    }
    async globalSearch(q, hotelId) {
        if (!q || q.length < 2)
            return { users: [], bookings: [], rooms: [], roomTypes: [], hotels: [], packages: [] };
        const usersPromise = this.prisma.user.findMany({
            where: {
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { email: { contains: q, mode: 'insensitive' } },
                    { phone: { contains: q, mode: 'insensitive' } },
                ],
                ...(hotelId ? { bookings: { some: { hotelId } } } : {})
            },
            take: 5,
        });
        const bookingsPromise = this.prisma.booking.findMany({
            where: {
                OR: [
                    { id: { contains: q, mode: 'insensitive' } },
                    { leadName: { contains: q, mode: 'insensitive' } },
                ],
                ...(hotelId ? { hotelId } : {})
            },
            take: 5,
            include: { roomType: true },
        });
        if (hotelId) {
            const [users, bookings, rooms, roomTypes] = await Promise.all([
                usersPromise,
                bookingsPromise,
                this.prisma.room.findMany({
                    where: {
                        roomNumber: { contains: q, mode: 'insensitive' },
                        ...(hotelId ? { roomType: { hotelId } } : {})
                    },
                    take: 5,
                    include: { roomType: true },
                }),
                this.prisma.roomType.findMany({
                    where: {
                        name: { contains: q, mode: 'insensitive' },
                        ...(hotelId ? { hotelId } : {})
                    },
                    take: 5,
                })
            ]);
            return { users, bookings, rooms, roomTypes, hotels: [], packages: [] };
        }
        else {
            const [users, bookings, hotels, packages] = await Promise.all([
                usersPromise,
                bookingsPromise,
                this.prisma.hotel.findMany({
                    where: {
                        OR: [
                            { name: { contains: q, mode: 'insensitive' } },
                            { city: { contains: q, mode: 'insensitive' } },
                            { owner: { email: { contains: q, mode: 'insensitive' } } }
                        ]
                    },
                    take: 5,
                    include: { owner: true }
                }),
                this.prisma.subscriptionPlan.findMany({
                    where: {
                        name: { contains: q, mode: 'insensitive' }
                    },
                    take: 5
                })
            ]);
            return { users, bookings, rooms: [], roomTypes: [], hotels, packages };
        }
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SearchService);
//# sourceMappingURL=search.service.js.map