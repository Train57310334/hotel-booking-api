import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as xlsx from 'xlsx';
import { parse } from 'json2csv';
import { format } from 'date-fns';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getRevenue(hotelId: string, from: Date, to: Date) {
    const revenue = await this.prisma.$queryRaw`
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

    return (revenue as any[]).map(r => ({
        date: new Date(r.date).toISOString().split('T')[0],
        value: Number(r.value)
    }));
  }

  async getExpenses(hotelId: string, from: Date, to: Date) {
    const expenses = await this.prisma.$queryRaw`
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

    return (expenses as any[]).map(r => ({
        date: new Date(r.date).toISOString().split('T')[0],
        value: Number(r.value)
    }));
  }

  async getOccupancy(hotelId: string, from: Date, to: Date) {
    // Ideally get total rooms from Hotel Room count
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

  async getBookingSources(hotelId: string, from: Date, to: Date) {
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

  async getSummary(hotelId: string, from: Date, to: Date) {
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

      const expenses = await (this.prisma as any).expense.aggregate({
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

  // --- EXPORT METHODS ---
  async exportToCsv(hotelId: string, from: Date, to: Date): Promise<string> {
      const summary = await this.getSummary(hotelId, from, to);
      const data = [
          {
              Period: `${format(from, 'yyyy-MM-dd')} to ${format(to, 'yyyy-MM-dd')}`,
              TotalBookings: summary.totalBookings,
              TotalRevenue: summary.totalRevenue,
              TotalExpenses: summary.totalExpenses,
              NetProfit: summary.totalProfit
          }
      ];
      
      return parse(data);
  }

  async exportToExcel(hotelId: string, from: Date, to: Date): Promise<Buffer> {
      const wb = xlsx.utils.book_new();

      // Sheet 1: Financial Summary
      const summary = await this.getSummary(hotelId, from, to);
      const summaryData = [
          ['Financial Summary Report'],
          ['Period:', `${format(from, 'yyyy-MM-dd')} to ${format(to, 'yyyy-MM-dd')}`],
          [],
          ['Metric', 'Amount'],
          ['Total Bookings', summary.totalBookings],
          ['Total Revenue (THB)', summary.totalRevenue],
          ['Total Expenses (THB)', summary.totalExpenses],
          ['Net Profit (THB)', summary.totalProfit],
      ];
      const summarySheet = xlsx.utils.aoa_to_sheet(summaryData);
      xlsx.utils.book_append_sheet(wb, summarySheet, 'Summary');

      // Sheet 2: Daily KPI (Night Audit)
      const dailyKPIs = await this.prisma.dailyStat.findMany({
          where: { date: { gte: from, lte: to } },
          orderBy: { date: 'asc' }
      });
      const kpiData = dailyKPIs.map(k => ({
          Date: format(k.date, 'yyyy-MM-dd'),
          'Occupied Rooms': k.occupiedRooms,
          'Occupancy (%)': k.occupancyRate.toFixed(2),
          'ADR (THB)': k.adr.toFixed(2),
          'RevPAR (THB)': k.revPar.toFixed(2),
          'Recognized Revenue': k.totalRevenue
      }));
      const kpiSheet = xlsx.utils.json_to_sheet(kpiData.length ? kpiData : [{Note: 'No data for period'}]);
      xlsx.utils.book_append_sheet(wb, kpiSheet, 'Night Audit KPIs');

      // Sheet 3: Expenses Log
      const expenses = await (this.prisma as any).expense.findMany({
          where: { hotelId, date: { gte: from, lte: to } },
          orderBy: { date: 'asc' }
      });
      const expData = expenses.map(e => ({
          Date: format(e.date, 'yyyy-MM-dd'),
          Title: e.title,
          Category: e.category.toUpperCase(),
          'Amount (THB)': e.amount
      }));
      const expSheet = xlsx.utils.json_to_sheet(expData.length ? expData : [{Note: 'No expenses for period'}]);
      xlsx.utils.book_append_sheet(wb, expSheet, 'Expenses Log');

      return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
