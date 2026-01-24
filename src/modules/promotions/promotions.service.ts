import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.PromotionUncheckedCreateInput) {
    const existing = await this.prisma.promotion.findUnique({
      where: { code: data.code }
    });
    if (existing) {
      throw new BadRequestException('Promotion code already exists');
    }
    
    // Ensure dates are objects
    return this.prisma.promotion.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate)
      }
    });
  }

  async findAll(hotelId?: string) {
    // If hotelId provided, filter by it. Or generic codes (hotelId null)
    return this.prisma.promotion.findMany({
      orderBy: { createdAt: 'desc' },
      where: hotelId ? { 
         OR: [{ hotelId }, { hotelId: null }]
      } : undefined
    });
  }

  async findOne(id: string) {
    return this.prisma.promotion.findUnique({ where: { id } });
  }

  async remove(id: string) {
    return this.prisma.promotion.delete({ where: { id } });
  }

  async validateCode(code: string, purchaseAmount: number) {
    const promo = await this.prisma.promotion.findUnique({
      where: { code }
    });

    if (!promo) {
      throw new NotFoundException('Invalid promo code');
    }

    const now = new Date();
    if (now < promo.startDate || now > promo.endDate) {
       throw new BadRequestException('Promotion expired or not yet active');
    }

    // Calculate discount
    let discountAmount = 0;
    if (promo.type === 'percent') {
      discountAmount = Math.floor(purchaseAmount * (promo.value / 100));
    } else {
      discountAmount = promo.value;
    }

    // Basic safety check: don't discount more than the total amount
    if (discountAmount > purchaseAmount) {
      discountAmount = purchaseAmount;
    }

    return {
      valid: true,
      code: promo.code,
      type: promo.type,
      value: promo.value,
      discountAmount
    };
  }
}
