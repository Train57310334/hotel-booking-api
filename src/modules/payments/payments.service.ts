import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string, status?: string) {
    const where: any = {};

    if (status && status !== 'All') {
      where.status = status.toLowerCase();
    }

    if (search) {
      where.OR = [
        { bookingId: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
        // Relation filtering requires more complex query or nested selection filtering. 
        // For simplicity, search mostly IDs here.
        // Or search booking leadName via relation:
        { booking: { leadName: { contains: search, mode: 'insensitive' } } }
      ];
    }

    return this.prisma.payment.findMany({
      where,
      include: {
        booking: {
          select: {
            id: true,
            leadName: true,
            room: { select: { id: true } }
          }
        }
      },
      orderBy: { booking: { createdAt: 'desc' } } // Fallback sort since payment might not have date
    });
  }
}
