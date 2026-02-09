import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string, hotelId?: string) {
    const where: any = {};
    if (hotelId) where.hotelId = hotelId;
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }
    // Using any for the missing type until restart
    return (this.prisma as any).message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { hotel: true }
    });
  }

  async findOne(id: string) {
    const msg = await (this.prisma as any).message.findUnique({ where: { id } });
    if (!msg) throw new NotFoundException('Message not found');
    return msg;
  }

  async create(data: any) {
    return (this.prisma as any).message.create({ data });
  }

  async markAsRead(id: string) {
    return (this.prisma as any).message.update({
      where: { id },
      data: { status: 'read' },
    });
  }

  async reply(id: string, replyContent: string) {
    // In real app, send email here
    return (this.prisma as any).message.update({
      where: { id },
      data: { status: 'replied' }, // simplistic status
    });
  }

  async archive(id: string) {
    return (this.prisma as any).message.update({
      where: { id },
      data: { status: 'archived' }
    });
  }

  async delete(id: string) {
    return (this.prisma as any).message.delete({
      where: { id }
    });
  }
}
