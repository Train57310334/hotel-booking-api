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
exports.RatesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let RatesService = class RatesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createRatePlan(data) {
        return this.prisma.ratePlan.create({ data });
    }
    async getRatePlans(hotelId) {
        return this.prisma.ratePlan.findMany({
            where: { hotelId },
            include: { roomType: true }
        });
    }
    async updateRatePlan(id, data) {
        return this.prisma.ratePlan.update({
            where: { id },
            data
        });
    }
    async deleteRatePlan(id) {
        return this.prisma.ratePlan.delete({ where: { id } });
    }
    async upsertOverride(data) {
        const dateObj = new Date(data.date);
        const existing = await this.prisma.rateOverride.findUnique({
            where: {
                roomTypeId_ratePlanId_date: {
                    roomTypeId: data.roomTypeId,
                    ratePlanId: data.ratePlanId,
                    date: dateObj
                }
            }
        });
        if (existing) {
            return this.prisma.rateOverride.update({
                where: { id: existing.id },
                data: {
                    baseRate: data.baseRate,
                    reason: data.reason
                }
            });
        }
        return this.prisma.rateOverride.create({
            data: {
                roomTypeId: data.roomTypeId,
                ratePlanId: data.ratePlanId,
                date: dateObj,
                baseRate: data.baseRate,
                reason: data.reason
            }
        });
    }
    async upsertOverrideBulk(data) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        const dates = [];
        let d = new Date(start);
        while (d <= end) {
            dates.push(new Date(d));
            d.setDate(d.getDate() + 1);
        }
        const operations = dates.map(date => {
            return this.prisma.rateOverride.upsert({
                where: {
                    roomTypeId_ratePlanId_date: {
                        roomTypeId: data.roomTypeId,
                        ratePlanId: data.ratePlanId,
                        date
                    }
                },
                create: {
                    roomTypeId: data.roomTypeId,
                    ratePlanId: data.ratePlanId,
                    date,
                    baseRate: data.baseRate,
                    reason: data.reason
                },
                update: {
                    baseRate: data.baseRate,
                    reason: data.reason
                }
            });
        });
        return this.prisma.$transaction(operations);
    }
    async getOverrides(roomTypeId, startDate, endDate) {
        return this.prisma.rateOverride.findMany({
            where: {
                roomTypeId,
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            }
        });
    }
    async calculatePrice(roomTypeId, ratePlanId, checkIn, checkOut) {
        const roomType = await this.prisma.roomType.findUnique({ where: { id: roomTypeId } });
        if (!roomType)
            throw new common_1.NotFoundException('Room Type not found');
        let total = 0;
        const d = new Date(checkIn);
        const overrides = await this.prisma.rateOverride.findMany({
            where: {
                roomTypeId,
                ratePlanId,
                date: {
                    gte: new Date(checkIn),
                    lt: new Date(checkOut)
                }
            }
        });
        while (d < checkOut) {
            const override = overrides.find(o => o.date.getTime() === d.getTime());
            if (override) {
                total += override.baseRate;
            }
            else {
                total += (roomType.basePrice || 1000);
            }
            d.setDate(d.getDate() + 1);
        }
        return total;
    }
};
exports.RatesService = RatesService;
exports.RatesService = RatesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RatesService);
//# sourceMappingURL=rates.service.js.map