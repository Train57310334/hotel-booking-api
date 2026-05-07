import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ChannelsService } from '@/modules/channels/channels.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class RatesService {
  constructor(
    private prisma: PrismaService,
    private channelsService: ChannelsService,
  ) {}

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
        const result = await this.prisma.rateOverride.update({
            where: { id: existing.id },
            data: {
                baseRate: data.baseRate,
                reason: data.reason
            }
        });
        
        // Push to Channel Manager
        this.channelsService.pushRateUpdate(data.roomTypeId, data.ratePlanId, [dateObj.toISOString().split('T')[0]]).catch(e => console.error(e));

        return result;
    }

    const result = await this.prisma.rateOverride.create({
        data: {
            roomTypeId: data.roomTypeId,
            ratePlanId: data.ratePlanId,
            date: dateObj,
            baseRate: data.baseRate,
            reason: data.reason
        }
    });

    // Push to Channel Manager
    this.channelsService.pushRateUpdate(data.roomTypeId, data.ratePlanId, [dateObj.toISOString().split('T')[0]]).catch(e => console.error(e));

    return result;
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

      const result = await this.prisma.$transaction(operations);

      // Push to Channel Manager
      const dateStrs = dates.map(d => d.toISOString().split('T')[0]);
      this.channelsService.pushRateUpdate(data.roomTypeId, data.ratePlanId, dateStrs).catch(e => console.error(e));

      return result;
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
      // 1. Get Base Price and context
      const roomType = await this.prisma.roomType.findUnique({ 
          where: { id: roomTypeId }
      });
      if (!roomType) throw new NotFoundException('Room Type not found');

      // 2. Fetch Yield Rules for this hotel
      const yieldRules = await this.prisma.yieldRule.findMany({
          where: { hotelId: roomType.hotelId, isActive: true }
      });

      // 3. Fetch Total Physical Rooms to calculate occupancy later
      const totalRooms = await this.prisma.room.count({
          where: { roomTypeId, deletedAt: null }
      });
      
      let total = 0;
      const d = new Date(checkIn);
      const today = new Date();
      today.setHours(0,0,0,0);

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

      // Fetch all inventory in range for occupancy check
      const inventories = await this.prisma.inventoryCalendar.findMany({
          where: {
              roomTypeId,
              date: {
                  gte: new Date(checkIn),
                  lt: new Date(checkOut)
              }
          }
      });
      const invMap = new Map<string, number>();
      inventories.forEach(i => invMap.set(i.date.toISOString().split('T')[0], i.allotment));

      while(d < checkOut) {
          const dateKey = d.toISOString().split('T')[0];
          
          if (!overrideMap.has(dateKey) && (roomType.basePrice == null || roomType.basePrice < 0)) {
              throw new BadRequestException(`Base price for room type ${roomType.name} is not configured for date ${dateKey}`);
          }
          
          let nightly = overrideMap.has(dateKey) ? overrideMap.get(dateKey)! : roomType.basePrice;
          
          // --- APPLY YIELD MANAGEMENT RULES ---
          let modifiedNightly = nightly;
          const daysToArrival = Math.max(0, Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
          const availableRooms = invMap.has(dateKey) ? invMap.get(dateKey)! : totalRooms;
          const occupancyPercent = totalRooms > 0 ? ((totalRooms - availableRooms) / totalRooms) * 100 : 0;

          for (const rule of yieldRules) {
              let conditionMet = false;

              // Check condition
              if (rule.triggerType === 'OCCUPANCY') {
                  if (rule.conditionOp === 'GREATER_THAN' && occupancyPercent > rule.conditionValue) conditionMet = true;
                  if (rule.conditionOp === 'LESS_THAN' && occupancyPercent < rule.conditionValue) conditionMet = true;
              } else if (rule.triggerType === 'DAYS_TO_ARRIVAL') {
                  if (rule.conditionOp === 'GREATER_THAN' && daysToArrival > rule.conditionValue) conditionMet = true;
                  if (rule.conditionOp === 'LESS_THAN' && daysToArrival < rule.conditionValue) conditionMet = true;
              }

              // Apply adjustment if condition met
              if (conditionMet) {
                  let adjAmount = rule.adjustmentType === 'PERCENTAGE' 
                      ? (nightly * (rule.adjustmentValue / 100))
                      : rule.adjustmentValue;

                  if (rule.adjustmentOp === 'DECREASE') {
                      modifiedNightly -= adjAmount;
                  } else {
                      modifiedNightly += adjAmount;
                  }
              }
          }

          // Ensure price never drops below 0
          total += Math.max(0, modifiedNightly);
          d.setDate(d.getDate() + 1);
      }

      return total;
  }
}
