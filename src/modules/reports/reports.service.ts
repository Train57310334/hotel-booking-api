import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getRevenue(from: Date, to: Date) {
    // Group revenue by date (simplified to day)
    // Prisma doesn't support complex date_trunc in groupBy easily without rawQuery, 
    // but for simplicity we can fetch and aggregate in JS or use raw query if performance needed.
    // Let's use raw query for efficiency in aggregation by day.
    
    // Note: Adjust timezone if needed, assuming UTC for now or database local time.
    const revenue = await this.prisma.$queryRaw`
      SELECT 
        DATE("checkIn") as date, 
        SUM("totalAmount") as value
      FROM "Booking"
      WHERE "status" NOT IN ('cancelled', 'pending')
      AND "checkIn" >= ${from}
      AND "checkIn" <= ${to}
      GROUP BY DATE("checkIn")
      ORDER BY date ASC
    `;

    // Process BigInt to Number if needed (Prisma returns BigInt for sums sometimes)
    return (revenue as any[]).map(r => ({
        date: new Date(r.date).toISOString().split('T')[0],
        value: Number(r.value)
    }));
  }

  async getOccupancy(from: Date, to: Date) {
    const totalRooms = 50; // Mock total rooms or fetch from Inventory sum
    
    // This is a bit complex to query accurately for every single day in range efficiently without a calendar table.
    // Simplified User Approach: Get counts per checkIn date (Arrivals) vs precise occupancy.
    // Better Approach: Iterate days in range loops (efficient for short ranges like 30 days).
    
    const days = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const dayStr = d.toISOString().split('T')[0];
        const nextDay = new Date(d);
        nextDay.setDate(d.getDate() + 1);

        const occupied = await this.prisma.booking.count({
            where: {
                status: { in: ['confirmed', 'checked_in'] },
                checkIn: { lte: d },
                checkOut: { gt: d }
            }
        });
        
        days.push({
            date: dayStr,
            rate: Math.round((occupied / totalRooms) * 100)
        });
    }
    return days;
  }

  async getBookingSources(from: Date, to: Date) {
    // Mocking sources since we don't have a 'source' field, using Payment Provider or RoomType as proxy for variety
    const byRoomType = await this.prisma.booking.groupBy({
        by: ['roomTypeId'],
        _count: { id: true },
        where: {
            createdAt: { gte: from, lte: to }
        }
    });

    // Resolve names
    const roomTypes = await this.prisma.roomType.findMany({
        where: { id: { in: byRoomType.map(b => b.roomTypeId) } }
    });

    return byRoomType.map(b => ({
        name: roomTypes.find(rt => rt.id === b.roomTypeId)?.name || 'Unknown',
        value: b._count.id
    }));
  }

  async getSummary(from: Date, to: Date) {
      const revenue = await this.prisma.booking.aggregate({
          _sum: { totalAmount: true },
          where: { 
              createdAt: { gte: from, lte: to },
              status: { not: 'cancelled' }
          }
      });
      
      const bookings = await this.prisma.booking.count({
          where: { createdAt: { gte: from, lte: to } }
      });

      return {
          totalRevenue: revenue._sum.totalAmount || 0,
          totalBookings: bookings
      };
  }
}
