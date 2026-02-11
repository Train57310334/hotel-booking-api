import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { hotelId: string; userId: string; rating: number; comment?: string }) {
    return this.prisma.review.create({
      data: {
        ...data,
        status: 'pending' 
      }
    });
  }

  async findAll(status?: string, hotelId?: string) {
    const where: any = {};
    if (status && status !== 'All') {
      where.status = status.toLowerCase();
    }
    if (hotelId) {
      where.hotelId = hotelId;
    }

    return this.prisma.review.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        hotel: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByHotel(hotelId: string) {
    return this.prisma.review.findMany({
      where: { 
        hotelId,
        status: 'approved'
      },
      include: {
        user: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.review.update({
      where: { id },
      data: { status }
    });
  }

  async delete(id: string) {
    return this.prisma.review.delete({
      where: { id }
    });
  }

  async getStats(hotelId?: string) {
    const where: any = {};
    if (hotelId) where.hotelId = hotelId;

    const total = await this.prisma.review.count({ where });
    const pending = await this.prisma.review.count({ where: { ...where, status: 'pending' } });
    const approved = await this.prisma.review.count({ where: { ...where, status: 'approved' } });
    const avg = await this.prisma.review.aggregate({
        _avg: { rating: true },
        where: { ...where, status: 'approved' }
    });

    return { total, pending, approved, averageRating: avg._avg.rating || 0 };
  }
}
