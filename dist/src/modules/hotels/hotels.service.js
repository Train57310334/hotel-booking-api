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
exports.HotelsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let HotelsService = class HotelsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, data) {
        return this.prisma.$transaction(async (tx) => {
            const hotel = await tx.hotel.create({
                data: {
                    name: data.name,
                    address: data.address,
                    city: data.city,
                    country: data.country,
                    description: data.description,
                    ownerId: userId
                }
            });
            await tx.roleAssignment.create({
                data: {
                    userId,
                    hotelId: hotel.id,
                    role: 'hotel_admin'
                }
            });
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user.roles.includes('hotel_admin')) {
                await tx.user.update({
                    where: { id: userId },
                    data: { roles: { push: 'hotel_admin' } }
                });
            }
            await tx.roomType.create({
                data: {
                    hotelId: hotel.id,
                    name: 'Standard Room',
                    bedConfig: 'Queen',
                    sizeSqm: 25,
                    basePrice: 1000,
                    maxAdults: 2,
                    description: 'Standard comfortable room',
                    ratePlans: {
                        create: {
                            hotelId: hotel.id,
                            name: 'Standard Rate',
                            cancellationRule: 'Free cancellation up to 24h',
                            includesBreakfast: false
                        }
                    }
                }
            });
            return hotel;
        });
    }
    list() {
        return this.prisma.hotel.findMany({
            include: {
                roomTypes: {
                    include: { ratePlans: true }
                },
                reviews: true
            }
        });
    }
    async search(query) {
        const { checkIn, checkOut, guests } = query;
        const startDate = new Date(checkIn);
        const endDate = new Date(checkOut);
        const guestCount = parseInt(guests || '1');
        const hotels = await this.prisma.hotel.findMany({
            include: {
                roomTypes: {
                    include: {
                        inventory: {
                            where: { date: { gte: startDate, lt: endDate } }
                        },
                        overrides: {
                            where: { date: { gte: startDate, lt: endDate } }
                        },
                        ratePlans: true
                    }
                },
                reviews: true
            }
        });
        const results = hotels.map(hotel => {
            const processed = this.processAvailability(hotel, startDate, endDate, guestCount);
            if (!processed.roomTypes.some(r => r.isAvailable))
                return null;
            const availableRooms = processed.roomTypes.filter(r => r.isAvailable);
            const minPrice = availableRooms.length > 0 ? Math.min(...availableRooms.map(r => r.ratePlans[0]?.totalPrice || 0)) : 0;
            return {
                ...hotel,
                roomTypes: availableRooms,
                minPrice,
                nights: processed.nights
            };
        }).filter(h => h !== null);
        return results;
    }
    async findWithAvailability(id, query) {
        const { checkIn, checkOut, guests } = query;
        const startDate = new Date(checkIn);
        const endDate = new Date(checkOut);
        const guestCount = parseInt(guests || '1');
        const hotel = await this.prisma.hotel.findUnique({
            where: { id },
            include: {
                roomTypes: {
                    include: {
                        inventory: {
                            where: { date: { gte: startDate, lt: endDate } }
                        },
                        overrides: {
                            where: { date: { gte: startDate, lt: endDate } }
                        },
                        ratePlans: true
                    }
                },
                reviews: true
            }
        });
        if (!hotel)
            return null;
        return this.processAvailability(hotel, startDate, endDate, guestCount);
    }
    processAvailability(hotel, startDate, endDate, guestCount) {
        const calcNights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const nights = calcNights > 0 ? calcNights : 1;
        const iterateEndDate = new Date(endDate);
        if (calcNights <= 0) {
            iterateEndDate.setDate(startDate.getDate() + 1);
        }
        const processedRoomTypes = hotel.roomTypes.map(rt => {
            if ((rt.maxAdults + rt.maxChildren) < guestCount) {
                return { ...rt, isAvailable: false, availabilityReason: 'Capacity exceeded' };
            }
            for (let d = new Date(startDate); d < iterateEndDate; d.setDate(d.getDate() + 1)) {
                const record = rt.inventory.find(inv => inv.date.toDateString() === d.toDateString());
                if (record && (record.allotment <= 0 || record.stopSale)) {
                    return { ...rt, isAvailable: false, availabilityReason: 'No availability' };
                }
            }
            const processedRatePlans = rt.ratePlans.map(rp => {
                let planTotal = 0;
                for (let d = new Date(startDate); d < iterateEndDate; d.setDate(d.getDate() + 1)) {
                    const override = rt.overrides.find(ovr => ovr.ratePlanId === rp.id &&
                        ovr.date.toDateString() === d.toDateString());
                    if (override) {
                        planTotal += override.baseRate;
                    }
                    else {
                        planTotal += (rt.basePrice || 0);
                        if (rp.includesBreakfast)
                            planTotal += 300;
                    }
                }
                return {
                    ...rp,
                    totalPrice: planTotal,
                    pricePerNight: planTotal / nights
                };
            });
            processedRatePlans.sort((a, b) => a.totalPrice - b.totalPrice);
            return {
                ...rt,
                isAvailable: true,
                ratePlans: processedRatePlans,
                nights
            };
        });
        return {
            ...hotel,
            roomTypes: processedRoomTypes,
            nights
        };
    }
    find(id) {
        return this.prisma.hotel.findUnique({
            where: { id },
            include: {
                roomTypes: {
                    include: { ratePlans: true }
                },
                reviews: true
            }
        });
    }
    update(id, data) {
        return this.prisma.hotel.update({
            where: { id },
            data
        });
    }
    async listForSuperAdmin() {
        const hotels = await this.prisma.hotel.findMany({
            include: {
                roomTypes: {
                    include: {
                        rooms: { select: { id: true } }
                    }
                },
                RoleAssignment: {
                    select: { id: true }
                }
            },
            orderBy: { id: 'desc' }
        });
        return hotels.map(hotel => {
            const totalRooms = hotel.roomTypes.reduce((sum, rt) => sum + (rt.rooms?.length || 0), 0);
            return {
                ...hotel,
                stats: {
                    roomTypeCount: hotel.roomTypes.length,
                    roomCount: totalRooms,
                    staffCount: hotel.RoleAssignment.length,
                },
                roomTypes: undefined,
                RoleAssignment: undefined
            };
        });
    }
    async getSuperStats() {
        const hotels = await this.prisma.hotel.findMany({
            include: {
                roomTypes: {
                    include: { rooms: { select: { id: true } } }
                }
            }
        });
        let totalHotels = hotels.length;
        let totalRooms = 0;
        let estimatedMRR = 0;
        let planCounts = {
            LITE: 0,
            PRO: 0,
            ENTERPRISE: 0
        };
        hotels.forEach(h => {
            totalRooms += h.roomTypes.reduce((sum, rt) => sum + (rt.rooms?.length || 0), 0);
            const pkg = h.package || 'LITE';
            if (pkg === 'PRO') {
                estimatedMRR += 990;
                planCounts.PRO++;
            }
            else if (pkg === 'ENTERPRISE') {
                estimatedMRR += 2990;
                planCounts.ENTERPRISE++;
            }
            else {
                planCounts.LITE++;
            }
        });
        const revenueChart = [
            { name: 'Jan', value: estimatedMRR * 0.3 },
            { name: 'Feb', value: estimatedMRR * 0.5 },
            { name: 'Mar', value: estimatedMRR * 0.7 },
            { name: 'Apr', value: estimatedMRR * 0.8 },
            { name: 'May', value: estimatedMRR * 0.9 },
            { name: 'Jun', value: estimatedMRR },
        ];
        const signupsChart = [
            { name: 'Jan', value: Math.floor(totalHotels * 0.2) },
            { name: 'Feb', value: Math.floor(totalHotels * 0.3) },
            { name: 'Mar', value: Math.floor(totalHotels * 0.4) },
            { name: 'Apr', value: Math.floor(totalHotels * 0.1) },
            { name: 'May', value: Math.floor(totalHotels * 0.5) },
            { name: 'Jun', value: Math.floor(totalHotels * 0.8) },
        ];
        return {
            totalHotels,
            totalRooms,
            estimatedMRR,
            planCounts,
            revenueChart,
            signupsChart
        };
    }
    async suspendHotel(id, isSuspended) {
        return this.prisma.hotel.update({
            where: { id },
            data: { isSuspended }
        });
    }
};
exports.HotelsService = HotelsService;
exports.HotelsService = HotelsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HotelsService);
//# sourceMappingURL=hotels.service.js.map