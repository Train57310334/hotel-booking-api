import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private inventoryService: InventoryService,
  ) {}

  async create(data: any) {
      // ✅ ตรวจสอบห้องว่างก่อน
      const available = await this.inventoryService.checkAvailability(
        data.roomTypeId,
        data.checkIn,
        data.checkOut,
      );
      if (!available) throw new NotFoundException('No rooms available for selected dates');

      // ✅ Transaction: จอง + หัก stock
      const booking = await this.prisma.$transaction(async (tx) => {
        const bookingData: Prisma.BookingUncheckedCreateInput = {
          userId: data.userId ?? null,
          hotelId: data.hotelId,
          roomTypeId: data.roomTypeId,
          ratePlanId: data.ratePlanId,
          roomId: data.roomId,
          checkIn: new Date(data.checkIn),
          checkOut: new Date(data.checkOut),
          guestsAdult: data.guests?.adult ?? 2,
          guestsChild: data.guests?.child ?? 0,
          totalAmount: data.totalAmount ?? 0,
          status: 'pending',
          leadName: data.leadGuest?.name ?? 'Guest',
          leadEmail: data.leadGuest?.email ?? 'guest@example.com',
          leadPhone: data.leadGuest?.phone ?? '',
          specialRequests: data.specialRequests ?? null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const newBooking = await tx.booking.create({
          data: bookingData,
          include: { hotel: true, roomType: true },
        });

        // ✅ หัก stock
        const dateRange: Date[] = [];
        let d = new Date(data.checkIn);
        const end = new Date(data.checkOut);
        while (d < end) {
          dateRange.push(new Date(d));
          d.setDate(d.getDate() + 1);
        }

        await this.inventoryService.reduceInventory(data.roomTypeId, dateRange);
        return newBooking;
      });

      // ✅ ส่งอีเมลยืนยันการจอง
      await this.notificationsService.sendBookingConfirmationEmail(booking);

      return booking;
  }

  /** 👤 การจองของลูกค้า */
  async getMyBookings(userId: string) {
    if (!userId) throw new NotFoundException('User ID is required');
    const now = new Date();

    const [upcoming, past] = await Promise.all([
      this.prisma.booking.findMany({
        where: { userId, checkIn: { gte: now } },
        include: { hotel: true, roomType: true, ratePlan: true, payment: true },
      }),
      this.prisma.booking.findMany({
        where: { userId, checkOut: { lt: now } },
        include: { hotel: true, roomType: true, ratePlan: true, payment: true },
      }),
    ]);
    return { upcoming, past };
  }

  /** 💳 ยืนยันการชำระเงิน */
  async confirmPayment(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { hotel: true, roomType: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    await this.notificationsService.sendPaymentSuccessEmail(booking);

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'confirmed' },
    });
  }

  /** ❌ ยกเลิกการจอง */
  async cancelBooking(bookingId: string, userId?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (userId && booking.userId !== userId)
      throw new NotFoundException('Unauthorized access');

    await this.notificationsService.sendCancellationEmail(booking);

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'cancelled' },
    });
  }

  /** 👮 Admin: ยกเลิกการจอง (ไม่ต้องเช็ค Owner) */
  async cancelBookingByAdmin(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { hotel: true }
    });
    if (!booking) throw new NotFoundException('Booking not found');

    await this.notificationsService.sendCancellationEmail(booking);

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'cancelled' },
    });
  }

  async find(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        hotel: true,
        roomType: true,
        ratePlan: true,
        payment: true,
      },
    });

    if (!booking) throw new NotFoundException(`Booking with ID ${id} not found`);
    return booking;
  }
  async findAll(search?: string, status?: string) {
    const where: Prisma.BookingWhereInput = {};

    if (status && status !== 'All') {
      where.status = status.toLowerCase();
    }

    if (search) {
      where.OR = [
        { leadName: { contains: search, mode: 'insensitive' } },
        { leadEmail: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } }
      ];
    }

    return this.prisma.booking.findMany({
      where,
      include: {
        hotel: true,
        user: true,
        roomType: true,
        room: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(bookingId: string, status: string) {
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    });
  }

  async getDashboardStats(period: string = 'month') {
    // 🗓️ Calculate Date Range
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        const day = startDate.getDay();
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'year':
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'all':
        startDate = new Date(0); // Epoch
        break;
      default:
        startDate.setDate(1); // Default to month
    }

    // 💰 Stats filtered by period
    const totalBookings = await this.prisma.booking.count({
        where: { createdAt: { gte: startDate } }
    });
    
    const confirmedBookings = await this.prisma.booking.count({ 
        where: { 
            status: 'confirmed',
            createdAt: { gte: startDate }
        } 
    });

    const totalRevenue = await this.prisma.booking.aggregate({
      _sum: { totalAmount: true },
      where: { 
          status: { not: 'cancelled' },
          createdAt: { gte: startDate }
      },
    });

    // 📊 Revenue Chart Data (Last 6 months OR Last 7 days if period is tight?)
    // For now, keep the chart logic separate (Always 6 months trend) or aligned? 
    // User request is likely about the Cards. Let's keep Chart as "Trends" (Fixed 6 months) for stability, 
    // or arguably chart should reflect view. Let's keep chart fixed for now to avoid breaking UI.
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1); 

    const recentBookings = await this.prisma.booking.findMany({
      where: {
        status: { not: 'cancelled' },
        createdAt: { gte: sixMonthsAgo },
      },
      select: { totalAmount: true, createdAt: true },
    });

    const revenueMap = new Map<string, number>();
    // Initialize last 6 months
    for (let i = 0; i < 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toLocaleString('default', { month: 'short' });
        revenueMap.set(key, 0);
    }

    recentBookings.forEach(b => {
        const key = new Date(b.createdAt).toLocaleString('default', { month: 'short' });
        if (revenueMap.has(key)) {
            revenueMap.set(key, (revenueMap.get(key) || 0) + b.totalAmount);
        }
    });

    // Sort by chronological order (simple approach: just reverse the map keys if generated backwards, but better to build array)
    const chartData = Array.from(revenueMap.entries()).map(([name, value]) => ({ name, value })).reverse();

    // 🏨 Room Stats
    // Assuming simple inventory logic for now (InventoryCalendar sum for today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const inventory = await this.prisma.inventoryCalendar.aggregate({
        _sum: { allotment: true },
        where: { date: today }
    });
    
    const occupied = await this.prisma.booking.count({
        where: {
            status: { in: ['confirmed', 'checked_in'] },
            checkIn: { lte: today },
            checkOut: { gt: today }
        }
    });

    const totalRooms = inventory._sum.allotment || 50; // Fallback to 50 if no inventory set
    const availableRooms = Math.max(0, totalRooms - occupied);

    return {
      totalBookings,
      confirmedBookings,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      chartData,
      totalRooms,
      availableRooms,
    };
  }

  async getCalendarBookings(month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const bookings = await this.prisma.booking.findMany({
      where: {
        checkIn: { lte: endDate },
        checkOut: { gte: startDate },
        status: { not: 'cancelled' }
      },
      select: { checkIn: true, checkOut: true }
    });

    // Simple daily count
    const daysInMonth = endDate.getDate();
    const result = [];
    
    for (let d = 1; d <= daysInMonth; d++) {
        const currentDate = new Date(year, month - 1, d);
        let count = 0;
        bookings.forEach(b => {
             if (currentDate >= new Date(b.checkIn) && currentDate < new Date(b.checkOut)) {
                 count++;
             }
        });
        result.push({ day: d, count });
    }
    return result;
  }
}
