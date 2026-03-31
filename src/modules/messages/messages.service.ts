import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService
  ) {}

  async findAll(search?: string, hotelId?: string, status?: string) {
    const where: any = {};
    if (hotelId) where.hotelId = hotelId;
    
    // Filter by status tab
    if (status === 'unread') where.status = 'unread';
    else if (status === 'replied') where.status = 'replied';
    else if (status === 'archived') where.status = 'archived';
    else {
      // Default: show all except archived
      where.status = { not: 'archived' };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { 
        hotel: true,
        replies: { orderBy: { createdAt: 'asc' } }
      }
    });
  }

  async findOne(id: string) {
    const msg = await this.prisma.message.findUnique({ 
      where: { id },
      include: { replies: { orderBy: { createdAt: 'asc' } } }
    });
    if (!msg) throw new NotFoundException('Message not found');
    return msg;
  }

  async create(data: any) {
    const msg = await this.prisma.message.create({ data });
    
    // Notify hotel staff
    if (data.hotelId) {
      await this.notificationsService.createNotification(
        'New Guest Message',
        `${data.name} sent a message: "${data.subject || 'General Inquiry'}"`,
        'info'
      );
    }
    
    return msg;
  }

  async markAsRead(id: string) {
    return this.prisma.message.update({
      where: { id },
      data: { status: 'read' },
    });
  }

  async reply(id: string, replyContent: string, staffName?: string) {
    // 1. Persist the reply as a MessageReply record
    const messageReply = await this.prisma.messageReply.create({
      data: {
        messageId: id,
        content: replyContent,
        staffName: staffName || 'Hotel Staff',
      }
    });

    // 2. Mark the parent message as replied
    await this.prisma.message.update({
      where: { id },
      data: { status: 'replied' },
    });

    // 3. In production: send email to guest here via NotificationsService / SMTP
    // await this.notificationsService.sendEmail(parentMsg.email, replyContent)

    return messageReply;
  }

  async archive(id: string) {
    return this.prisma.message.update({
      where: { id },
      data: { status: 'archived', archivedAt: new Date() }
    });
  }

  async delete(id: string) {
    return this.prisma.message.delete({ where: { id } });
  }

  async getUnreadCount(hotelId: string) {
    const count = await this.prisma.message.count({
      where: { hotelId, status: 'unread' }
    });
    return { count };
  }
}
