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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let InventoryService = class InventoryService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getInventoryByRoomType(roomTypeId, startDate, endDate) {
        const inventories = await this.prisma.inventoryCalendar.findMany({
            where: {
                roomTypeId,
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            },
            orderBy: { date: 'asc' },
        });
        return inventories;
    }
    async updateInventory(roomTypeId, date, data) {
        const existing = await this.prisma.inventoryCalendar.findUnique({
            where: { roomTypeId_date: { roomTypeId, date: new Date(date) } },
        });
        if (!existing) {
            return this.prisma.inventoryCalendar.create({
                data: {
                    roomTypeId,
                    date: new Date(date),
                    allotment: data.allotment ?? 0,
                    stopSale: data.stopSale ?? false,
                    minStay: data.minStay ?? 1,
                },
            });
        }
        return this.prisma.inventoryCalendar.update({
            where: { roomTypeId_date: { roomTypeId, date: new Date(date) } },
            data,
        });
    }
    async updateBulk(roomTypeId, startDate, endDate, data) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dates = [];
        let d = new Date(start);
        while (d <= end) {
            dates.push(new Date(d));
            d.setDate(d.getDate() + 1);
        }
        const operations = dates.map(date => {
            return this.prisma.inventoryCalendar.upsert({
                where: { roomTypeId_date: { roomTypeId, date } },
                create: {
                    roomTypeId,
                    date,
                    allotment: data.allotment ?? 0,
                    stopSale: data.stopSale ?? false,
                    minStay: data.minStay ?? 1
                },
                update: {
                    ...(data.allotment !== undefined && { allotment: data.allotment }),
                    ...(data.stopSale !== undefined && { stopSale: data.stopSale }),
                    ...(data.minStay !== undefined && { minStay: data.minStay }),
                }
            });
        });
        return this.prisma.$transaction(operations);
    }
    async reduceInventory(roomTypeId, dateRange, tx) {
        const prisma = tx || this.prisma;
        const totalRooms = await prisma.room.count({
            where: { roomTypeId, deletedAt: null }
        });
        for (const date of dateRange) {
            const record = await prisma.inventoryCalendar.findUnique({
                where: { roomTypeId_date: { roomTypeId, date } },
            });
            if (record) {
                if (record.allotment <= 0) {
                    throw new common_1.NotFoundException(`No inventory available for ${date.toDateString()}`);
                }
                await prisma.inventoryCalendar.update({
                    where: { roomTypeId_date: { roomTypeId, date } },
                    data: { allotment: { decrement: 1 } },
                });
            }
            else {
                if (totalRooms <= 0) {
                    throw new common_1.NotFoundException(`No physical rooms found for this Room Type, and no inventory set.`);
                }
                await prisma.inventoryCalendar.create({
                    data: {
                        roomTypeId,
                        date,
                        allotment: totalRooms - 1,
                        stopSale: false,
                        minStay: 1
                    }
                });
            }
        }
    }
    async checkAvailability(roomTypeId, startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dates = [];
        let d = new Date(start);
        while (d < end) {
            dates.push(new Date(d));
            d.setDate(d.getDate() + 1);
        }
        const inventories = await this.prisma.inventoryCalendar.findMany({
            where: {
                roomTypeId,
                date: { in: dates },
            },
        });
        const totalRooms = await this.prisma.room.count({
            where: { roomTypeId, deletedAt: null }
        });
        for (const date of dates) {
            const record = inventories.find(i => i.date.getTime() === date.getTime());
            if (record) {
                if (record.stopSale || record.allotment <= 0) {
                    return false;
                }
            }
            else {
                if (totalRooms <= 0) {
                    return false;
                }
            }
        }
        return true;
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map