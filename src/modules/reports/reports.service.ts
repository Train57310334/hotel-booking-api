import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

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
}
