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
exports.RoomTypesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let RoomTypesService = class RoomTypesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    listByHotel(hotelId) {
        return this.prisma.roomType.findMany({
            where: { hotelId, deletedAt: null },
            orderBy: { createdAt: 'desc' }
        });
    }
    findAll(hotelId) {
        const where = { deletedAt: null };
        if (hotelId)
            where.hotelId = hotelId;
        return this.prisma.roomType.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                hotel: true,
                ratePlans: true,
                rooms: {
                    where: { deletedAt: null }
                }
            }
        });
    }
    findOne(id) { return this.prisma.roomType.findFirst({ where: { id, deletedAt: null } }); }
    async create(data) {
        try {
            if (data.hotelId) {
                const hotel = await this.prisma.hotel.findUnique({
                    where: { id: data.hotelId },
                    select: { maxRoomTypes: true }
                });
                if (hotel) {
                    const currentCount = await this.prisma.roomType.count({
                        where: { hotelId: data.hotelId, deletedAt: null }
                    });
                    if (currentCount >= hotel.maxRoomTypes) {
                        throw new common_1.BadRequestException(`Your plan is limited to ${hotel.maxRoomTypes} room types. Please upgrade.`);
                    }
                }
            }
            const { price, ...rest } = data;
            const basePrice = price !== undefined ? Number(price) : rest.basePrice;
            const parsedBasePrice = basePrice !== undefined ? Number(basePrice) : undefined;
            return await this.prisma.roomType.create({
                data: {
                    ...rest,
                    basePrice: parsedBasePrice,
                    ratePlans: {
                        create: {
                            hotelId: rest.hotelId,
                            name: 'Standard Rate',
                            cancellationRule: 'Free cancellation up to 24h',
                            includesBreakfast: false
                        }
                    }
                },
            });
        }
        catch (e) {
            console.error(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async update(id, data) {
        try {
            const { price, id: _, ...rest } = data;
            return await this.prisma.roomType.update({
                where: { id },
                data: {
                    ...rest,
                    ...(price !== undefined ? { basePrice: Number(price) } : {})
                }
            });
        }
        catch (e) {
            console.error(e);
            throw new common_1.BadRequestException(e.message);
        }
    }
    async remove(id) {
        return this.prisma.$transaction(async (tx) => {
            const roomType = await tx.roomType.update({
                where: { id },
                data: { deletedAt: new Date() }
            });
            await tx.room.updateMany({
                where: { roomTypeId: id, deletedAt: null },
                data: { deletedAt: new Date() }
            });
            return roomType;
        });
    }
};
exports.RoomTypesService = RoomTypesService;
exports.RoomTypesService = RoomTypesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RoomTypesService);
//# sourceMappingURL=room-types.service.js.map