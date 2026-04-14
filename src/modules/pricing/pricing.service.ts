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
      where: { id: roomTypeId, hotelId }
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

      // Yield Logic Placeholder (Phase 10)
      // TODO: Fetch YieldRules and determine occupancy to adjust dailyRate.

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

    const taxesAndFees = 0; // Configurable if VAT 7% applies externally based on settings
    let total = subtotal - discount + taxesAndFees;
    
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
