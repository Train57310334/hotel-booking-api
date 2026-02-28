import { Controller, Get, Put, Post, Param, UseGuards, Body, Request, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { Request as ExpressRequest } from 'express';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  async getNotifications(@Request() req: ExpressRequest & { user: any }) {
    const user = req.user;
    const isSuperAdmin = user.roles && user.roles.includes('platform_admin');

    const data = await this.prisma.notification.findMany({
      where: isSuperAdmin 
        ? { OR: [{ userId: null }, { userId: user.id }] } 
        : { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return data.map(n => ({
        ...n,
        time: this.timeAgo(n.createdAt)
    }));
  }

  @Get('test')
  async triggerTest() {
    await this.notificationsService.createNotification('Test Notification', 'This is a test notification from the admin panel.', 'info');
    return { success: true };
  }

  @Post('test-email')
  async testEmail(@Request() req: ExpressRequest & { user: any }, @Query('type') type: string, @Query('to') to: string) {
      const user = req.user;
      if (!to) to = user.email || 'test@example.com';
      
      const hotel = await this.prisma.hotel.findFirst();
      if (!hotel) return { success: false, message: 'No hotel config found' };
      
      const dummyBooking = {
          id: 'TEST-' + Math.floor(Math.random() * 100000),
          hotel: hotel,
          leadName: user.name || 'Test User',
          leadEmail: to,
          checkIn: new Date(Date.now() + 86400000), // Tomorrow
          checkOut: new Date(Date.now() + 86400000 * 3), // +3 days
          totalAmount: 15400,
          roomType: { 
              name: 'Deluxe Ocean View', 
              images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=600'] 
          }
      };

      if (type === 'received') await this.notificationsService.sendBookingReceivedEmail(dummyBooking);
      else if (type === 'confirmed') await this.notificationsService.sendBookingConfirmationEmail(dummyBooking);
      else if (type === 'feedback') await this.notificationsService.sendFeedbackRequest(dummyBooking);
      else return { success: false, message: 'Invalid type' };

      return { success: true, message: `Sent test ${type} email to ${to}` };
  }

  private timeAgo(date: Date) {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  }

  @Put(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
  }

  @Put('read-all')
  async markAllAsRead(@Request() req: ExpressRequest & { user: any }) {
    const user = req.user;
    const isSuperAdmin = user.roles && user.roles.includes('platform_admin');

    return this.prisma.notification.updateMany({
      where: isSuperAdmin 
        ? { isRead: false, OR: [{ userId: null }, { userId: user.id }] } 
        : { isRead: false, userId: user.id },
      data: { isRead: true }
    });
  }
}
