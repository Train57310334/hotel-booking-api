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
exports.HousekeepingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let HousekeepingService = class HousekeepingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getHousekeepingStatus(hotelId) {
        const hotel = await this.prisma.hotel.findUnique({
            where: { id: hotelId }
        });
        if (!hotel) {
            throw new common_1.NotFoundException(`Hotel with ID ${hotelId} not found`);
        }
        const roomTypes = await this.prisma.roomType.findMany({
            where: { hotelId },
            include: {
                rooms: {
                    include: {
                        statusLogs: {
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                            include: {
                                user: {
                                    select: { id: true, name: true, email: true }
                                }
                            }
                        },
                        bookings: {
                            where: {
                                status: { in: ['checked_in'] },
                            },
                            take: 1
                        }
                    },
                    orderBy: {
                        roomNumber: 'asc'
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });
        const formattedData = roomTypes.map(rt => {
            return {
                id: rt.id,
                name: rt.name,
                bedConfig: rt.bedConfig,
                rooms: rt.rooms.map(room => {
                    const isOccupied = room.bookings.length > 0;
                    const latestLog = room.statusLogs[0];
                    return {
                        id: room.id,
                        roomNumber: room.roomNumber,
                        status: room.status,
                        isOccupied,
                        lastStatusUpdate: latestLog ? {
                            updatedAt: latestLog.createdAt,
                            updatedBy: latestLog.user?.name || 'System',
                            note: latestLog.note
                        } : null,
                        currentGuest: isOccupied ? room.bookings[0].leadName : null,
                        checkOutDate: isOccupied ? room.bookings[0].checkOut : null,
                    };
                })
            };
        });
        return formattedData;
    }
    async updateRoomStatus(roomId, status, userId, note) {
        const room = await this.prisma.room.findUnique({
            where: { id: roomId }
        });
        if (!room) {
            throw new common_1.NotFoundException(`Room with ID ${roomId} not found`);
        }
        const updatedRoom = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.room.update({
                where: { id: roomId },
                data: { status }
            });
            await tx.roomStatusLog.create({
                data: {
                    roomId,
                    status,
                    updatedBy: userId || null,
                    note: note || null,
                }
            });
            return updated;
        });
        return updatedRoom;
    }
};
exports.HousekeepingService = HousekeepingService;
exports.HousekeepingService = HousekeepingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HousekeepingService);
//# sourceMappingURL=housekeeping.service.js.map