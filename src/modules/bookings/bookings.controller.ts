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
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { IsString, IsNumber, IsOptional, IsObject, IsEmail, IsDateString } from 'class-validator';

class CreateBookingDto {
  @IsString()
  hotelId: string;

  @IsString()
  roomTypeId: string;

  @IsString()
  ratePlanId: string;

  @IsString()
  roomId: string; // Ensure this is string

  @IsString()
  @IsDateString()
  checkIn: string;

  @IsString()
  @IsDateString()
  checkOut: string;

  @IsOptional()
  @IsObject()
  guests?: { adult: number; child: number };

  @IsObject()
  leadGuest: { name: string; email: string; phone: string };

  @IsOptional()
  @IsString()
  specialRequests?: string;

  @IsOptional()
  @IsNumber()
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
    console.log('Received CreateBookingDto:', JSON.stringify(dto, null, 2));
    const userId = req.user?.userId;
    try {
      return await this.svc.create({ ...dto, userId });
    } catch (e) {
      console.error('Error in BookingsController.create:', e);
      throw e;
    }
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
  /**
   * 📊 Admin Dashboard Stats
   */
  /**
   * 📅 Admin: Calendar Density
   */
  @UseGuards(JwtAuthGuard)
  @Get('admin/calendar')
  async getCalendarStats(@Req() req, @Body() body) {
     // For simplicity, use current date or query params. 
     // NestJS standard is @Query but let's default to now if not provided
     const now = new Date();
     // In real app, extract Query params ?month=11&year=2024
     // For this Demo, we just return current month
     return this.svc.getCalendarBookings(now.getMonth() + 1, now.getFullYear());
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/dashboard')
  async getDashboardStats(@Req() req, @Query('period') period?: string) {
    // TODO: Add Role Guard here
    return this.svc.getDashboardStats(period);
  }

  /**
   * 📋 Admin: Get All Bookings
   */
  @Get('admin/all')
  async getAllBookings(@Req() req, @Query('search') search?: string, @Query('status') status?: string) {
    // TODO: Add Role Guard here
    return this.svc.findAll(search, status);
  }

  /**
   * 👮 Admin: Cancel Booking
   */
  @UseGuards(JwtAuthGuard)
  @Put('admin/:id/cancel')
  async cancelBookingByAdmin(@Param('id') bookingId: string) {
    return this.svc.cancelBookingByAdmin(bookingId);
  }

  /**
   * ✏️ Admin: Update Booking Status
   */
  @UseGuards(JwtAuthGuard)
  @Put('admin/:id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    // TODO: Add Role Guard here
    return this.svc.updateStatus(id, status);
  }
}
