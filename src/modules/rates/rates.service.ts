import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class RatesService {
  constructor(private prisma: PrismaService) {}

  // --- Rate Plans ---

  async createRatePlan(data: Prisma.RatePlanUncheckedCreateInput) {
    return this.prisma.ratePlan.create({ data });
  }

  async getRatePlans(hotelId: string) {
    return this.prisma.ratePlan.findMany({
      where: { hotelId },
      include: { roomType: true }
    });
  }

  async updateRatePlan(id: string, data: Prisma.RatePlanUncheckedUpdateInput) {
    return this.prisma.ratePlan.update({
      where: { id },
      data
    });
  }

  async deleteRatePlan(id: string) {
    return this.prisma.ratePlan.delete({ where: { id } });
  }

  // --- Rate Overrides (Daily Prices) ---

  async upsertOverride(data: {
    roomTypeId: string;
    ratePlanId: string;
    date: string | Date; // ISO string 
    baseRate: number;
    reason?: string;
  }) {
    const dateObj = new Date(data.date);
    
    // Check if exists
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

  async upsertOverrideBulk(data: {
    roomTypeId: string;
    ratePlanId: string;
    startDate: string;
    endDate: string;
    baseRate: number;
    reason?: string;
  }) {
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

  async getOverrides(roomTypeId: string, startDate: string, endDate: string) {
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

  // --- Pricing Calculation Helper ---
  
  async calculatePrice(
      roomTypeId: string, 
      ratePlanId: string, 
      checkIn: Date, 
      checkOut: Date
  ): Promise<number> {
      // 1. Get Base Price from RoomType
      const roomType = await this.prisma.roomType.findUnique({ where: { id: roomTypeId } });
      if (!roomType) throw new NotFoundException('Room Type not found');
      
      let total = 0;
      const d = new Date(checkIn);

      // Fetch all overrides in range
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

      const overrideMap = new Map<string, number>();
      overrides.forEach(o => overrideMap.set(o.date.toISOString().split('T')[0], o.baseRate));

      while(d < checkOut) {
          const dateKey = d.toISOString().split('T')[0];
          
          if (overrideMap.has(dateKey)) {
              total += overrideMap.get(dateKey)!;
          } else {
              let nightly = roomType.basePrice || 1000;
              // If we want to be strict, we can query ratePlan.breakfastPrice here, 
              // but RatesService is a primitive fallback.
              total += nightly;
          }
          d.setDate(d.getDate() + 1);
      }

      return total;
  }
}
