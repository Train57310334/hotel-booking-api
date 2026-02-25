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
exports.RoomsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let RoomsService = class RoomsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(search, hotelId) {
        const where = {
            deletedAt: null,
        };
        if (hotelId) {
            where.roomType = {
                hotelId: hotelId
            };
        }
        return this.prisma.room.findMany({
            where,
            include: {
                roomType: true,
                bookings: {
                    where: {
                        status: { in: ['confirmed', 'checked_in'] },
                        checkOut: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
                    },
                    orderBy: { checkIn: 'asc' },
                    take: 5
                },
                statusLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { roomNumber: 'asc' }
        });
    }
    async getAvailableRooms(roomTypeId, checkIn, checkOut) {
        if (!roomTypeId || !checkIn || !checkOut) {
            return [];
        }
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const rooms = await this.prisma.room.findMany({
            where: { roomTypeId, deletedAt: null },
            orderBy: { roomNumber: 'asc' }
        });
        const conflictingBookings = await this.prisma.booking.findMany({
            where: {
                roomTypeId: roomTypeId,
                status: { in: ['confirmed', 'checked_in'] },
                roomId: { not: null },
                checkIn: { lt: checkOutDate },
                checkOut: { gt: checkInDate }
            },
            select: { roomId: true }
        });
        const conflictingRoomIds = new Set(conflictingBookings.map(b => b.roomId));
        const roomIds = rooms.map(r => r.id);
        const latestStatusLogs = await this.prisma.roomStatusLog.findMany({
            where: { roomId: { in: roomIds } },
            orderBy: { createdAt: 'desc' },
            distinct: ['roomId']
        });
        const statusMap = new Map();
        latestStatusLogs.forEach(log => statusMap.set(log.roomId, log.status));
        return rooms
            .filter(room => !conflictingRoomIds.has(room.id))
            .map(room => {
            const status = statusMap.get(room.id) || 'CLEAN';
            return {
                ...room,
                status
            };
        });
    }
    async create(data) {
        try {
            const roomType = await this.prisma.roomType.findUnique({
                where: { id: data.roomTypeId },
                include: { hotel: true }
            });
            if (!roomType)
                throw new common_1.NotFoundException('Room Type not found');
            const currentRoomCount = await this.prisma.room.count({
                where: {
                    roomType: { hotelId: roomType.hotelId },
                    deletedAt: null
                }
            });
            const maxRooms = roomType.hotel.maxRooms;
            if (currentRoomCount >= maxRooms) {
                throw new common_1.ConflictException(`Your plan is limited to ${maxRooms} rooms. Please upgrade your plan for more rooms.`);
            }
            return await this.prisma.room.create({
                data: {
                    roomTypeId: data.roomTypeId,
                    roomNumber: data.roomNumber,
                }
            });
        }
        catch (error) {
            if (error.code === 'P2002') {
                throw new common_1.ConflictException('Room number already exists');
            }
            throw error;
        }
    }
    async createBulk(data) {
        const { roomTypeId, prefix = '', startNumber, count } = data;
        const roomType = await this.prisma.roomType.findUnique({
            where: { id: roomTypeId },
            include: { hotel: true }
        });
        if (!roomType)
            throw new common_1.NotFoundException('Room Type not found');
        const currentRoomCount = await this.prisma.room.count({
            where: {
                roomType: { hotelId: roomType.hotelId },
                deletedAt: null
            }
        });
        const maxRooms = roomType.hotel.maxRooms;
        if ((currentRoomCount + count) > maxRooms) {
            throw new common_1.ConflictException(`Your plan is limited to ${maxRooms} rooms. You have ${currentRoomCount} rooms and are trying to add ${count} more.`);
        }
        const roomsToCreate = [];
        for (let i = 0; i < count; i++) {
            roomsToCreate.push({
                roomTypeId,
                roomNumber: `${prefix}${startNumber + i}`,
            });
        }
        try {
            return await this.prisma.room.createMany({
                data: roomsToCreate,
                skipDuplicates: true,
            });
        }
        catch (error) {
            console.error("Bulk Room Creation Error:", error);
            throw new common_1.BadRequestException("Failed to create rooms. Some room numbers may already exist.");
        }
    }
    async findOne(id) {
        const room = await this.prisma.room.findFirst({
            where: { id, deletedAt: null },
            include: { roomType: true }
        });
        if (!room)
            throw new common_1.NotFoundException('Room not found');
        return room;
    }
    async update(id, data) {
        try {
            return await this.prisma.room.update({
                where: { id },
                data: {
                    roomTypeId: data.roomTypeId,
                    roomNumber: data.roomNumber
                }
            });
        }
        catch (error) {
            if (error.code === 'P2002') {
                throw new common_1.ConflictException('Room number already exists');
            }
            if (error.code === 'P2025') {
                throw new common_1.NotFoundException(`Room with ID ${id} not found or Room Type ${data.roomTypeId} invalid.`);
            }
            throw error;
        }
    }
    async remove(id) {
        return this.prisma.room.update({
            where: { id },
            data: { deletedAt: new Date() }
        });
    }
    async updateStatus(id, status, userId, note) {
        await this.prisma.roomStatusLog.create({
            data: {
                roomId: id,
                status: status,
                updatedBy: userId,
                note: note
            }
        });
        return this.prisma.room.update({
            where: { id },
            data: { status }
        });
    }
};
exports.RoomsService = RoomsService;
exports.RoomsService = RoomsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RoomsService);
//# sourceMappingURL=rooms.service.js.map