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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ReportsService = class ReportsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getRevenue(hotelId, from, to) {
        const revenue = await this.prisma.$queryRaw `
      SELECT 
        DATE("checkIn") as date, 
        SUM("totalAmount") as value
      FROM "Booking"
      WHERE "hotelId" = ${hotelId}
      AND "status" NOT IN ('cancelled', 'pending')
      AND "checkIn" >= ${from}
      AND "checkIn" <= ${to}
      GROUP BY DATE("checkIn")
      ORDER BY date ASC
    `;
        return revenue.map(r => ({
            date: new Date(r.date).toISOString().split('T')[0],
            value: Number(r.value)
        }));
    }
    async getExpenses(hotelId, from, to) {
        const expenses = await this.prisma.$queryRaw `
      SELECT 
        DATE("date") as date, 
        SUM("amount") as value
      FROM "Expense"
      WHERE "hotelId" = ${hotelId}
      AND "date" >= ${from}
      AND "date" <= ${to}
      GROUP BY DATE("date")
      ORDER BY date ASC
    `;
        return expenses.map(r => ({
            date: new Date(r.date).toISOString().split('T')[0],
            value: Number(r.value)
        }));
    }
    async getOccupancy(hotelId, from, to) {
        const totalRooms = await this.prisma.room.count({ where: { roomType: { hotelId } } }) || 50;
        const days = [];
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
            const dayStr = d.toISOString().split('T')[0];
            const occupied = await this.prisma.booking.count({
                where: {
                    hotelId,
                    status: { in: ['confirmed', 'checked_in'] },
                    checkIn: { lte: d },
                    checkOut: { gt: d }
                }
            });
            days.push({
                date: dayStr,
                rate: totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0
            });
        }
        return days;
    }
    async getBookingSources(hotelId, from, to) {
        const byRoomType = await this.prisma.booking.groupBy({
            by: ['roomTypeId'],
            _count: { id: true },
            where: {
                hotelId,
                createdAt: { gte: from, lte: to }
            }
        });
        const roomTypes = await this.prisma.roomType.findMany({
            where: { id: { in: byRoomType.map(b => b.roomTypeId) } }
        });
        return byRoomType.map(b => ({
            name: roomTypes.find(rt => rt.id === b.roomTypeId)?.name || 'Unknown',
            value: b._count.id
        }));
    }
    async getSummary(hotelId, from, to) {
        const revenue = await this.prisma.booking.aggregate({
            _sum: { totalAmount: true },
            where: {
                hotelId,
                createdAt: { gte: from, lte: to },
                status: { not: 'cancelled' }
            }
        });
        const bookings = await this.prisma.booking.count({
            where: { hotelId, createdAt: { gte: from, lte: to } }
        });
        const expenses = await this.prisma.expense.aggregate({
            _sum: { amount: true },
            where: { hotelId, date: { gte: from, lte: to } }
        });
        const totalRevenue = revenue._sum.totalAmount || 0;
        const totalExpenses = expenses._sum.amount || 0;
        return {
            totalRevenue,
            totalExpenses,
            totalProfit: totalRevenue - totalExpenses,
            totalBookings: bookings
        };
    }
    async getDefaultHotelId() {
        const hotel = await this.prisma.hotel.findFirst();
        return hotel?.id;
    }
    async getDailyStats() {
        return this.prisma.dailyStat.findMany({
            orderBy: { date: 'desc' },
            take: 30
        });
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map