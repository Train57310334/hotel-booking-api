import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(data: { hotelId: string; title: string; amount: number; date: string; category?: string }) {
    return this.prisma.expense.create({
      data: {
        hotelId: data.hotelId,
        title: data.title,
        amount: data.amount,
        date: new Date(data.date),
        category: data.category || 'general',
      },
    });
  }

  async findAll(hotelId: string, from?: string, to?: string) {
    const where: any = { hotelId };
    if (from && to) {
      where.date = {
        gte: new Date(from),
        lte: new Date(to),
      };
    }
    return this.prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.expense.update({
      where: { id },
      data: {
          ...data,
          ...(data.date && { date: new Date(data.date) })
      },
    });
  }

  async delete(id: string) {
    return this.prisma.expense.delete({
      where: { id },
    });
  }
}
