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
var NightAuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NightAuditService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let NightAuditService = NightAuditService_1 = class NightAuditService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(NightAuditService_1.name);
    }
    async handleNightAudit() {
        this.logger.log('🌙 Starting Night Audit...');
        try {
            await this.autoMarkNoShow();
            await this.generateDailySnapshot();
            this.logger.log('✅ Night Audit Completed Successfully.');
        }
        catch (e) {
            this.logger.error('❌ Night Audit Failed', e);
        }
    }
    async autoMarkNoShow() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lateBookings = await this.prisma.booking.findMany({
            where: {
                status: 'confirmed',
                checkIn: {
                    lt: today
                }
            }
        });
        if (lateBookings.length > 0) {
            this.logger.log(`Found ${lateBookings.length} bookings to mark as NO_SHOW.`);
            const ids = lateBookings.map(b => b.id);
            const result = await this.prisma.booking.updateMany({
                where: { id: { in: ids } },
                data: { status: 'no_show' }
            });
            this.logger.log(`Updated ${result.count} bookings to NO_SHOW.`);
        }
        else {
            this.logger.log('No bookings to mark as NO_SHOW.');
        }
    }
    async generateDailySnapshot() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);
        this.logger.log(`📊 Generating Snapshot for ${yesterday.toISOString().split('T')[0]}`);
        const totalRooms = await this.prisma.room.count({
            where: { deletedAt: null }
        });
        const activeBookings = await this.prisma.booking.findMany({
            where: {
                status: 'checked_in',
                checkIn: { lte: yesterdayEnd },
                checkOut: { gt: yesterday }
            },
            include: { roomType: true }
        });
        const occupiedRooms = activeBookings.length;
        let dailyRevenue = 0;
        for (const booking of activeBookings) {
            const nights = Math.max(1, Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)));
            dailyRevenue += (booking.totalAmount || 0) / nights;
        }
        const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
        const adr = occupiedRooms > 0 ? dailyRevenue / occupiedRooms : 0;
        const revPar = totalRooms > 0 ? dailyRevenue / totalRooms : 0;
        await this.prisma.dailyStat.upsert({
            where: { date: yesterday },
            update: {
                totalRevenue: dailyRevenue,
                totalBookings: activeBookings.length,
                occupiedRooms,
                occupancyRate,
                adr,
                revPar
            },
            create: {
                date: yesterday,
                totalRevenue: dailyRevenue,
                totalBookings: activeBookings.length,
                occupiedRooms,
                occupancyRate,
                adr,
                revPar
            }
        });
        this.logger.log(`✅ Snapshot Saved: Occupancy=${occupancyRate.toFixed(1)}%, ADR=${adr.toFixed(2)}, RevPAR=${revPar.toFixed(2)}`);
    }
};
exports.NightAuditService = NightAuditService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_2AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NightAuditService.prototype, "handleNightAudit", null);
exports.NightAuditService = NightAuditService = NightAuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NightAuditService);
//# sourceMappingURL=night-audit.service.js.map