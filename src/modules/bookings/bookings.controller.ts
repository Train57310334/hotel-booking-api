import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Req,
  Put,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class CreateBookingDto {
  hotelId: string;
  roomTypeId: string;
  ratePlanId: string;
  checkIn: string;
  checkOut: string;
  guests?: { adult: number; child: number };
  leadGuest: { name: string; email: string; phone: string };
  specialRequests?: string;
  totalAmount?: number;
}

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private svc: BookingsService) {}

  /**
   * 🏨 สร้างการจองใหม่
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req, @Body() dto: CreateBookingDto) {
    const userId = req.user?.userId;
    return this.svc.create({ ...dto, userId });
  }

  /**
   * 📋 ดึงข้อมูลการจองตาม ID
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async get(@Req() req, @Param('id') id: string) {
    const booking = await this.svc.find(id);

    // ตรวจสอบสิทธิ์ว่าเป็นของ user คนนี้ไหม
    if (booking.userId !== req.user.userId) {
      throw new ForbiddenException('Unauthorized access');
    }

    return booking;
  }

  /**
   * 🧾 ดึงรายการ "การจองของฉัน"
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async getMyBookings(@Req() req) {
    const userId = req.user.userId;
    return this.svc.getMyBookings(userId);
  }

  /**
   * 💳 ยืนยันการชำระเงิน
   */
  @UseGuards(JwtAuthGuard)
  @Put(':id/confirm-payment')
  async confirmPayment(@Param('id') bookingId: string) {
    return this.svc.confirmPayment(bookingId);
  }

  /**
   * ❌ ยกเลิกการจอง
   */
  @UseGuards(JwtAuthGuard)
  @Put(':id/cancel')
  async cancelBooking(@Req() req, @Param('id') bookingId: string) {
    const userId = req.user.userId;
    return this.svc.cancelBooking(bookingId, userId);
  }
}
