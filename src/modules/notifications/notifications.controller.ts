import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@Req() req) {
    // In a real app, filter by user/admin. For now, return recent ones.
    return [
        { id: 1, title: 'New Booking', message: 'You have a new booking from John Doe', time: '2 mins ago', read: false },
        { id: 2, title: 'Payment Confirmed', message: 'Payment for #BK123 confirmed', time: '1 hour ago', read: true },
        { id: 3, title: 'Low Inventory', message: 'Deluxe Room is running low on inventory', time: 'Yesterday', read: true },
    ];
  }
}
