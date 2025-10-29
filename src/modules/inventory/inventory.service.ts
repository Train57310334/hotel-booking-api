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

  async reduceInventory(roomTypeId: string, dateRange: Date[]) {
    for (const date of dateRange) {
      const record = await this.prisma.inventoryCalendar.findUnique({
        where: { roomTypeId_date: { roomTypeId, date } },
      });

      if (!record || record.allotment <= 0)
        throw new NotFoundException(`No inventory available for ${date.toDateString()}`);

      await this.prisma.inventoryCalendar.update({
        where: { roomTypeId_date: { roomTypeId, date } },
        data: { allotment: record.allotment - 1 },
      });
    }
  }

  async checkAvailability(roomTypeId: string, startDate: string, endDate: string) {
    const inventories = await this.prisma.inventoryCalendar.findMany({
      where: {
        roomTypeId,
        date: { gte: new Date(startDate), lt: new Date(endDate) },
        stopSale: false,
        allotment: { gt: 0 },
      },
    });
    return inventories.length > 0;
  }
}
