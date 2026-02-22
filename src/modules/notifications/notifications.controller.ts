import { Controller, Get, Put, Param, UseGuards, Body, Request } from '@nestjs/common';
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
