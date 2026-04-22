import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PromotionsService } from '../promotions/promotions.service';

export interface PricingDto {
  hotelId: string;
  roomTypeId: string;
  ratePlanId?: string;
  checkIn: string;
  checkOut: string;
  promoCode?: string;
}

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotionsService: PromotionsService,
  ) {}

  async calculate(dto: PricingDto) {
    const { hotelId, roomTypeId, ratePlanId, checkIn, checkOut, promoCode } = dto;

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      throw new BadRequestException('Invalid date range');
    }

    const roomType = await this.prisma.roomType.findFirst({
      where: { id: roomTypeId, hotelId },
      include: {
        hotel: {
          select: { taxIncluded: true, taxRate: true, serviceChargeRate: true }
        }
      }
    });

    if (!roomType) {
      throw new BadRequestException('Room type not found for this hotel');
    }

    let ratePlan = null;
    let breakfastAddon = 0;
    if (ratePlanId) {
      ratePlan = await this.prisma.ratePlan.findUnique({
        where: { id: ratePlanId }
      });
      if (ratePlan && ratePlan.includesBreakfast) {
        breakfastAddon = ratePlan.breakfastPrice || 0;
      }
    }

    // Fetch overrides for this room type within the date range
    const overrides = await this.prisma.rateOverride.findMany({
      where: {
        roomTypeId,
        ...(ratePlanId ? { ratePlanId } : {}),
        date: {
          gte: start,
          lt: end
        }
      }
    });

    const overrideMap = new Map();
    overrides.forEach(ov => {
      const dateKey = ov.date.toISOString().split('T')[0];
      overrideMap.set(dateKey, ov.baseRate);
    });

    // --- Yield Management Setup ---
    const yieldRules = await this.prisma.yieldRule.findMany({
      where: { hotelId, isActive: true }
    });

    let totalRooms = 0;
    // Pre-computed per-date occupancy map: dateKey -> bookedCount
    // Built once before the pricing loop to avoid O(bookings × nights) repeated .filter() calls.
    const occupancyByDate = new Map<string, number>();
    const hasOccupancyRules = yieldRules.some(r => r.triggerType === 'OCCUPANCY');

    if (hasOccupancyRules) {
        totalRooms = await this.prisma.room.count({ where: { roomTypeId, deletedAt: null, status: { not: 'OOO' } } });
        const overlappingBookings = await this.prisma.booking.findMany({
            where: {
                roomTypeId,
                status: { notIn: ['cancelled', 'no_show'] },
                checkIn: { lt: end },
                checkOut: { gt: start }
            },
            select: { checkIn: true, checkOut: true }
        });

        // Build occupancy map by iterating each booking's date range once — O(bookings × avg_stay)
        for (const b of overlappingBookings) {
            let d = new Date(Math.max(new Date(b.checkIn).getTime(), start.getTime()));
            const bEnd = new Date(Math.min(new Date(b.checkOut).getTime(), end.getTime()));
            while (d < bEnd) {
                const key = d.toISOString().split('T')[0];
                occupancyByDate.set(key, (occupancyByDate.get(key) || 0) + 1);
                d.setDate(d.getDate() + 1);
            }
        }
    }
    // ------------------------------

    let subtotal = 0;
    const nights = [];
    const basePrice = roomType.basePrice || 1000;

    let currentDate = new Date(start);
    while (currentDate < end) {
      const dateKey = currentDate.toISOString().split('T')[0];
      let dailyRate = basePrice;

      // Rate Override Priority #1
      if (overrideMap.has(dateKey)) {
        dailyRate = overrideMap.get(dateKey);
      }

      // Add Rate Plan specifics (e.g. breakfast)
      dailyRate += breakfastAddon;

      // --- Yield Management Logic ---
      let dailyOccupancy = 0;
      if (hasOccupancyRules && totalRooms > 0) {
          // O(1) lookup — map was pre-built before this loop
          dailyOccupancy = ((occupancyByDate.get(dateKey) || 0) / totalRooms) * 100;
      }
      
      // Calculate start of today for precise day diff
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(currentDate);
      targetDate.setHours(0, 0, 0, 0);
      const daysToArrival = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let yieldMultiplier = 1;
      let yieldFixedAdjustment = 0;

      for (const rule of yieldRules) {
         let triggerMatched = false;
         
         if (rule.triggerType === 'OCCUPANCY') {
             if (rule.conditionOp === 'GREATER_THAN' && dailyOccupancy > rule.conditionValue) triggerMatched = true;
             if (rule.conditionOp === 'LESS_THAN' && dailyOccupancy < rule.conditionValue) triggerMatched = true;
         } else if (rule.triggerType === 'DAYS_TO_ARRIVAL') {
             if (rule.conditionOp === 'GREATER_THAN' && daysToArrival > rule.conditionValue) triggerMatched = true;
             if (rule.conditionOp === 'LESS_THAN' && daysToArrival < rule.conditionValue) triggerMatched = true;
         }

         if (triggerMatched) {
             if (rule.adjustmentType === 'PERCENTAGE') {
                 if (rule.adjustmentOp === 'INCREASE') yieldMultiplier += (rule.adjustmentValue / 100);
                 if (rule.adjustmentOp === 'DECREASE') yieldMultiplier -= (rule.adjustmentValue / 100);
             } else if (rule.adjustmentType === 'FIXED') {
                 if (rule.adjustmentOp === 'INCREASE') yieldFixedAdjustment += rule.adjustmentValue;
                 if (rule.adjustmentOp === 'DECREASE') yieldFixedAdjustment -= rule.adjustmentValue;
             }
         }
      }

      if (yieldMultiplier < 0.2) yieldMultiplier = 0.2; // Prevent 100% discount via rules
      dailyRate = Math.floor(dailyRate * yieldMultiplier) + yieldFixedAdjustment;
      if (dailyRate < 0) dailyRate = 0;
      // -------------------------------

      subtotal += dailyRate;
      nights.push({
        date: dateKey,
        price: dailyRate
      });

      // Increment 1 day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    let discount = 0;
    let appliedPromo = null;

    if (promoCode && subtotal > 0) {
      try {
        const promoResult = await this.promotionsService.validateCode(promoCode, subtotal, hotelId);
        if (promoResult && promoResult.valid) {
          discount = promoResult.discountAmount;
          appliedPromo = promoResult;
        }
      } catch (e) {
        // Suppress validation errors for partial inputs during realtime calculation
      }
    }

    // Calculate Taxes and Fees
    const hotelConf = roomType.hotel;
    const combinedRate = (hotelConf.taxRate + hotelConf.serviceChargeRate) / 100;
    const postDiscountAmount = Math.max(0, subtotal - discount);
    
    let taxesAndFees = 0;
    let total = postDiscountAmount;

    if (hotelConf.taxIncluded) {
        // Total does not increase. Compute the hidden taxes to present on invoice line item.
        taxesAndFees = Math.floor(postDiscountAmount - (postDiscountAmount / (1 + combinedRate)));
        // total remains postDiscountAmount
    } else {
        // Taxes are added on top of the subtotal
        taxesAndFees = Math.floor(postDiscountAmount * combinedRate);
        total = postDiscountAmount + taxesAndFees;
    }
    
    // Safety boundary
    if (total < 0) total = 0;

    return {
      nights,
      subtotal,
      discount,
      appliedPromo,
      taxesAndFees,
      total,
      currency: 'THB'
    };
  }
}
