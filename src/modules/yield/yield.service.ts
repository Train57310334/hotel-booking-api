import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class YieldService {
  constructor(private readonly prisma: PrismaService) {}

  async getRules(hotelId: string) {
    return this.prisma.yieldRule.findMany({
      where: { hotelId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getActiveRules(hotelId: string) {
    return this.prisma.yieldRule.findMany({
      where: { hotelId, isActive: true },
      // Ordering by conditions or types could be helpful if multiple rules apply,
      // but for now we'll fetch all active and process them iteratively.
    });
  }

  async createRule(data: Prisma.YieldRuleUncheckedCreateInput) {
    return this.prisma.yieldRule.create({
      data: {
        ...data,
      }
    });
  }

  async updateRule(id: string, data: Prisma.YieldRuleUncheckedUpdateInput) {
    const existing = await this.prisma.yieldRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Rule not found');
    
    return this.prisma.yieldRule.update({
      where: { id },
      data
    });
  }

  async deleteRule(id: string) {
    const existing = await this.prisma.yieldRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Rule not found');

    return this.prisma.yieldRule.delete({
      where: { id }
    });
  }
}
