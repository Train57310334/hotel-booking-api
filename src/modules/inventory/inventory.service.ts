import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getInventoryByRoomType(roomTypeId: string, startDate: string, endDate: string) {
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

  async updateInventory(
    roomTypeId: string,
    date: string,
    data: { allotment?: number; stopSale?: boolean; minStay?: number },
  ) {
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

  async updateBulk(
    roomTypeId: string,
    startDate: string,
    endDate: string,
    data: { allotment?: number; stopSale?: boolean; minStay?: number }
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];

    // Generate dates array
    let d = new Date(start);
    while (d <= end) {
      dates.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }

    // Update Transaction
    // 1. Upsert for each date effectively
    // Since Prisma doesn't have "upsertMany", we can try delete+create (dangerous if data loss) or loop upserts.
    // For safety and simplicity in this context, loop upserts in transaction is fine for < 365 days.
    
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

  async reduceInventory(roomTypeId: string, dateRange: Date[]) {
    // 1. Get total physical rooms count to use as default base if inventory doesn't exist
    const totalRooms = await this.prisma.room.count({
      where: { roomTypeId, deletedAt: null }
    });

    for (const date of dateRange) {
      const record = await this.prisma.inventoryCalendar.findUnique({
        where: { roomTypeId_date: { roomTypeId, date } },
      });

      if (record) {
        if (record.allotment <= 0) {
           throw new NotFoundException(`No inventory available for ${date.toDateString()}`);
        }
        await this.prisma.inventoryCalendar.update({
          where: { roomTypeId_date: { roomTypeId, date } },
          data: { allotment: record.allotment - 1 },
        });
      } else {
        // Record doesn't exist, assume full availability (totalRooms) minus 1
        if (totalRooms <= 0) {
           throw new NotFoundException(`No physical rooms found for this Room Type, and no inventory set.`);
        }
        await this.prisma.inventoryCalendar.create({
          data: {
            roomTypeId,
            date,
            allotment: totalRooms - 1, // Default was totalRooms, now reducing by 1
            stopSale: false,
            minStay: 1
          }
        });
      }
    }
  }

  async checkAvailability(roomTypeId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Generate all dates
    const dates: Date[] = [];
    let d = new Date(start);
    while (d < end) {
        dates.push(new Date(d));
        d.setDate(d.getDate() + 1);
    }

    // 1. Get explicit inventory
    const inventories = await this.prisma.inventoryCalendar.findMany({
      where: {
        roomTypeId,
        date: { in: dates },
      },
    });

    // 2. Get fallback limit (physical room count)
    const totalRooms = await this.prisma.room.count({
      where: { roomTypeId, deletedAt: null }
    });

    // 3. Check every single date
    for (const date of dates) {
        const record = inventories.find(i => i.date.getTime() === date.getTime());

        if (record) {
            // Explicit record exists
            if (record.stopSale || record.allotment <= 0) {
                return false;
            }
        } else {
            // No record, fallback to check physical rooms
            // If we have rooms, we assume it's Open. If 0 rooms, it's Closed.
            if (totalRooms <= 0) {
                return false;
            }
        }
    }
    
    return true;
  }
}
