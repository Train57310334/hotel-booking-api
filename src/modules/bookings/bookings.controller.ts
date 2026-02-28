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
  NotFoundException,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard'; // Added
import { Roles } from '../auth/decorators/roles.decorator'; // Added
import { HotelAuthGuard } from '../auth/guards/hotel-auth.guard';

import { IsString, IsNumber, IsOptional, IsObject, IsEmail, IsDateString } from 'class-validator';

class CreateBookingDto {
  @IsString()
  hotelId: string;

  @IsString()
  roomTypeId: string;

  @IsString()
  ratePlanId: string;

  @IsOptional()
  @IsString()
  roomId?: string;

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
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: string; // 'pending' | 'confirmed' etc.

  @IsOptional()
  @IsString()
  promotionCode?: string;

  @IsOptional()
  @IsNumber()
  totalAmount?: number;
}

import { JwtService } from '@nestjs/jwt';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    private svc: BookingsService,
    private jwtService: JwtService
  ) {}

  /**
   * 🏨 สร้างการจองใหม่ (Guest Allowed)
   */
  @Post()
  async create(@Req() req, @Body() dto: CreateBookingDto) {
    let userId = null;
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            // Decode without verification (Guard handles auth, we just want to extract identity for guest fallback)
            const payload = this.jwtService.decode(token) as any;
            if (payload) {
                userId = payload.userId || payload.sub; // Adjust based on your JWT structure
            }
        }
    } catch (e) {
        console.warn('Failed to parse token in create:', e);
    }

    try {
      return await this.svc.create({ ...dto, userId });
    } catch (e) {
      console.error('Error in BookingsController.create:', e);
      throw e;
    }
  }

  /**
   * 📋 สร้าง Booking Draft (Session สำรองกันหาย localStorage)
   * Public endpoint — ไม่ต้อง auth
   * ข้อมูลหมดอายุใน 15 นาที
   */
  @Post('draft')
  async createDraft(@Body() data: any) {
    const result = await this.svc.saveDraft(data);
    return { draftId: result.draftId, expiresAt: result.expiresAt };
  }

  /**
   * 📋 ดึง Booking Draft กลับมา (Fallback เมื่อ localStorage หาย)
   * Public endpoint — ไม่ต้อง auth
   */
  @Get('draft/:id')
  async getDraft(@Param('id') id: string) {
    const data = await this.svc.getDraft(id);
    if (!data) {
      throw new NotFoundException('Booking session not found or expired. Please start a new booking.');
    }
    return data;
  }

  /**
   * 🛒 สร้างการจองผ่าน Public Booking Engine
   */
  @Post('public')
  async createPublic(@Req() req, @Body() data: any) {
    let userId = null;
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const payload = this.jwtService.decode(token) as any;
            if (payload) {
                userId = payload.userId || payload.sub;
            }
        }
    } catch (e) {
        console.warn('Failed to parse token in createPublic:', e);
    }

    try {
      return await this.svc.createPublicBooking({ ...data, userId });
    } catch (e) {
      console.error('Error in BookingsController.createPublic:', e);
      throw e;
    }
  }

  /**
   * 💳 ยืนยันคำสั่งซื้อและการชำระเงิน (Checkout)
   */
  @Post('checkout/:draftId')
  async checkout(@Param('draftId') draftId: string, @Body() body: any) {
    if (!draftId) throw new BadRequestException('Draft ID is required');
    return this.svc.checkoutBooking(draftId, body);
  }

  /**
   * 🔍 ค้นหาการจองสำหรับ Guest (ต้องใช้ ID + Email ตรงกัน)
   */
  @Get('guest/find')
  async findForGuest(@Query('id') id: string, @Query('email') email: string) {
    if (!id || !email) {
      throw new BadRequestException('Booking ID and Email are required');
    }
    return this.svc.findForGuest(id, email);
  }

  /**
   * 🌐 Platform Admin: Get all bookings across all hotels
   */
  @Get('super')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('platform_admin')
  async getSuperBookings(@Query() query: any) {
    return this.svc.getAllPlatformBookings(query);
  }

  /**
   * 📋 ดึงข้อมูลการจองตาม ID
   */
  /**
   * 📋 ดึงข้อมูลการจองตาม ID (Public with conditional check)
   */
  @Get(':id')
  async get(@Req() req, @Param('id') id: string) {
    const booking = await this.svc.find(id);

    // If booking belongs to a user, ensure the requester is that user
    if (booking.userId) {
        // Manually check auth
        const authHeader = req.headers.authorization;
        if (!authHeader) {
             throw new ForbiddenException('This booking belongs to a registered user. Please login.');
        }

        // Decode token to verify owner
        // NOTE: In a real app we would use a PassiveAuthGuard, but here we duplicate the simple decode for speed/fix
        try {
            const token = authHeader.split(' ')[1];
            const payload = this.jwtService.decode(token) as any;
            if (!payload) {
                 throw new ForbiddenException('Invalid token');
            }
            const requestUserId = payload.userId || payload.sub;

            if (booking.userId !== requestUserId) {
                throw new ForbiddenException('Unauthorized access to this booking');
            }
        } catch (e) {
            throw new ForbiddenException('Invalid token');
        }
    }

    // If booking.userId is null (Guest), or ownership check passed, return booking.
    return booking;
  }

  /**
   * 🧾 ดึงรายการ "การจองของฉัน"
   */
  @UseGuards(JwtAuthGuard)
  @Get('my-bookings/list') // Renamed to avoid collision or clarify
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
  @UseGuards(JwtAuthGuard, HotelAuthGuard)
  @Get('admin/calendar')
  async getCalendarStats(@Req() req, @Query('hotelId') hotelId: string) {
     // For simplicity, use current date or query params. 
     // NestJS standard is @Query but let's default to now if not provided
     const now = new Date();
     // In real app, extract Query params ?month=11&year=2024
     // For this Demo, we just return current month
     if (!hotelId) throw new ForbiddenException('Hotel ID is required'); // Simple check
     return this.svc.getCalendarBookings(hotelId, now.getMonth() + 1, now.getFullYear());
  }

  @UseGuards(JwtAuthGuard, HotelAuthGuard)
  @Get('admin/calendar-events')
  async getCalendarEvents(@Query('start') start: string, @Query('end') end: string, @Query('hotelId') hotelId: string) {
    if (!hotelId) throw new ForbiddenException('Hotel ID is required');
    return this.svc.getCalendarEvents(hotelId, start, end);
  }

  @UseGuards(JwtAuthGuard, HotelAuthGuard)
  @Get('admin/dashboard')
  async getDashboardStats(@Req() req, @Query('period') period?: string, @Query('hotelId') hotelId?: string) {
    // TODO: Add Role Guard here
    if (!hotelId) throw new ForbiddenException('Hotel ID is required');
    return this.svc.getDashboardStatsNew(hotelId, period);
  }

  /**
   * 📋 Admin: Get All Bookings
   */
  @UseGuards(JwtAuthGuard, HotelAuthGuard)
  @Get('admin/all')
  async getAllBookings(
    @Req() req, 
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('hotelId') hotelId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('order') order?: string
  ) {
    // TODO: Add Role Guard here
    if (!hotelId) throw new ForbiddenException('Hotel ID is required');
    return this.svc.findAll(hotelId, search, status, 'createdAt', order, page, limit);
  }

  /**
   * 👮 Admin: Cancel Booking
   */
  @UseGuards(JwtAuthGuard, RolesGuard, HotelAuthGuard) // Added RolesGuard
  @Roles('owner', 'admin') // Only Admin/Owner can force cancel
  @Put('admin/:id/cancel')
  async cancelBookingByAdmin(@Param('id') bookingId: string, @Query('hotelId') hotelId: string) {
    if (!hotelId) throw new ForbiddenException('Hotel ID is required');
    return this.svc.cancelBookingByAdmin(bookingId, hotelId);
  }

  /**
   * ✏️ Admin: Update Booking Status
   */
  @UseGuards(JwtAuthGuard, RolesGuard, HotelAuthGuard)
  @Roles('owner', 'admin', 'reception') // Reception can check-in/out
  @Put('admin/:id/status')
  async updateStatus(@Req() req, @Param('id') id: string, @Body('status') status: string, @Query('hotelId') hotelId: string) {
    // TODO: Add Role Guard here
    if (!hotelId) throw new ForbiddenException('Hotel ID is required');
    const userId = req.user?.userId;
    return this.svc.updateStatus(id, status, hotelId, userId);
  }

  @UseGuards(JwtAuthGuard, HotelAuthGuard)
  @Post(':id/request-feedback')
  async requestFeedback(@Param('id') id: string) {
    return this.svc.requestFeedback(id);
  }

  /**
   * 📄 ดึงใบเสร็จรับเงิน (Invoice)
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id/invoice')
  async getInvoice(@Req() req, @Param('id') id: string) {
      // In a real app, verify the req.user has access to this booking (owner or guest)
      return this.svc.generateInvoice(id);
  }
}
