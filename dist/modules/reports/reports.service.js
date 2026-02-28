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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const xlsx = __importStar(require("xlsx"));
const json2csv_1 = require("json2csv");
const date_fns_1 = require("date-fns");
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
    async exportToCsv(hotelId, from, to) {
        const summary = await this.getSummary(hotelId, from, to);
        const data = [
            {
                Period: `${(0, date_fns_1.format)(from, 'yyyy-MM-dd')} to ${(0, date_fns_1.format)(to, 'yyyy-MM-dd')}`,
                TotalBookings: summary.totalBookings,
                TotalRevenue: summary.totalRevenue,
                TotalExpenses: summary.totalExpenses,
                NetProfit: summary.totalProfit
            }
        ];
        return (0, json2csv_1.parse)(data);
    }
    async exportToExcel(hotelId, from, to) {
        const wb = xlsx.utils.book_new();
        const summary = await this.getSummary(hotelId, from, to);
        const summaryData = [
            ['Financial Summary Report'],
            ['Period:', `${(0, date_fns_1.format)(from, 'yyyy-MM-dd')} to ${(0, date_fns_1.format)(to, 'yyyy-MM-dd')}`],
            [],
            ['Metric', 'Amount'],
            ['Total Bookings', summary.totalBookings],
            ['Total Revenue (THB)', summary.totalRevenue],
            ['Total Expenses (THB)', summary.totalExpenses],
            ['Net Profit (THB)', summary.totalProfit],
        ];
        const summarySheet = xlsx.utils.aoa_to_sheet(summaryData);
        xlsx.utils.book_append_sheet(wb, summarySheet, 'Summary');
        const dailyKPIs = await this.prisma.dailyStat.findMany({
            where: { date: { gte: from, lte: to } },
            orderBy: { date: 'asc' }
        });
        const kpiData = dailyKPIs.map(k => ({
            Date: (0, date_fns_1.format)(k.date, 'yyyy-MM-dd'),
            'Occupied Rooms': k.occupiedRooms,
            'Occupancy (%)': k.occupancyRate.toFixed(2),
            'ADR (THB)': k.adr.toFixed(2),
            'RevPAR (THB)': k.revPar.toFixed(2),
            'Recognized Revenue': k.totalRevenue
        }));
        const kpiSheet = xlsx.utils.json_to_sheet(kpiData.length ? kpiData : [{ Note: 'No data for period' }]);
        xlsx.utils.book_append_sheet(wb, kpiSheet, 'Night Audit KPIs');
        const expenses = await this.prisma.expense.findMany({
            where: { hotelId, date: { gte: from, lte: to } },
            orderBy: { date: 'asc' }
        });
        const expData = expenses.map(e => ({
            Date: (0, date_fns_1.format)(e.date, 'yyyy-MM-dd'),
            Title: e.title,
            Category: e.category.toUpperCase(),
            'Amount (THB)': e.amount
        }));
        const expSheet = xlsx.utils.json_to_sheet(expData.length ? expData : [{ Note: 'No expenses for period' }]);
        xlsx.utils.book_append_sheet(wb, expSheet, 'Expenses Log');
        return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map