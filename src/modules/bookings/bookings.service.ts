import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
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
      // 1. Check Inventory Availability (General Room Type)
      const available = await this.inventoryService.checkAvailability(
        data.roomTypeId,
        data.checkIn,
        data.checkOut,
      );
      if (!available) throw new NotFoundException('No rooms available for selected dates');

      // 2. Check Specific Room Conflict (If roomId provided)
      const checkInDate = new Date(data.checkIn);
      const checkOutDate = new Date(data.checkOut);

      if (data.roomId) {
          const roomConflict = await this.prisma.booking.findFirst({
              where: {
                  roomId: data.roomId,
                  status: { not: 'cancelled' },
                  checkIn: { lt: checkOutDate }, // Overlap logic
                  checkOut: { gt: checkInDate }
              }
          });

          if (roomConflict) {
              throw new NotFoundException(`Selected Room is already booked for these dates.`);
          }
      }

      // 2.1 Auto-assign Room if not provided
      if (!data.roomId) {
          // Find all rooms of this type
          const rooms = await this.prisma.room.findMany({
              where: { roomTypeId: data.roomTypeId }
          });
          
          // Find one that is NOT booked during these dates
          for (const room of rooms) {
              const conflict = await this.prisma.booking.findFirst({
                  where: {
                      roomId: room.id,
                      status: { not: 'cancelled' },
                      checkIn: { lt: checkOutDate },
                      checkOut: { gt: checkInDate }
                  }
              });
              if (!conflict) {
                  data.roomId = room.id;
                  break;
              }
          }

          if (!data.roomId) {
             throw new NotFoundException('No specific room available for assignment (unexpected inventory mismatch)');
          }
      }

      // 3. Price Validation & Calculation
      const validatedPrice = await this.calculateTotalPrice(
        data.roomTypeId,
        data.ratePlanId,
        checkInDate,
        checkOutDate,
        data.promotionCode,
      );
      
      // If client sent a price deviance > 1% or > 50 units
      if (data.totalAmount && Math.abs(data.totalAmount - validatedPrice) > 50) {
          // Warning or Error? Let's be strict but clear.
          throw new BadRequestException(`Price validation failed: Server calculated ${validatedPrice}, but received ${data.totalAmount}`);
      }
      // Enforce server-side price (if client didn't send it, or if it was close enough)
      data.totalAmount = validatedPrice;

      // 4. Transaction: Create Booking + Deduct Inventory
      const booking = await this.prisma.$transaction(async (tx) => {
        const bookingData: Prisma.BookingUncheckedCreateInput = {
          userId: data.userId ?? null,
          hotelId: data.hotelId,
          roomTypeId: data.roomTypeId,
          ratePlanId: data.ratePlanId,
          roomId: data.roomId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
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

        if (data.paymentMethod) {
            // Create nested payment
            await tx.payment.create({
                data: {
                    bookingId: newBooking.id,
                    amount: data.totalAmount ?? 0,
                    provider: data.paymentMethod,
                    status: data.paymentStatus ?? 'pending',
                    currency: 'THB'
                }
            });
        }

        // Deduct Stock
        const dateRange: Date[] = [];
        let d = new Date(checkInDate);
        while (d < checkOutDate) {
          dateRange.push(new Date(d));
          d.setDate(d.getDate() + 1);
        }

        await this.inventoryService.reduceInventory(data.roomTypeId, dateRange);
        return newBooking;
      });

      // 4. Send Confirmation Email
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
  async cancelBookingByAdmin(bookingId: string, hotelId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { hotel: true }
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.hotelId !== hotelId) throw new ForbiddenException('Booking does not belong to this hotel');

    await this.notificationsService.sendCancellationEmail(booking);

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'cancelled' },
    });
  }

  async requestFeedback(id: string) {
    const booking = await this.prisma.booking.findUnique({
        where: { id },
        include: { hotel: true, roomType: true }
    });
    if (!booking) throw new NotFoundException('Booking not found');

    await this.notificationsService.sendFeedbackRequest(booking);
    return { success: true, message: 'Feedback request sent' };
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
  async findAll(hotelId: string, search?: string, status?: string, sortBy: string = 'createdAt', order: string = 'desc') {
    const where: Prisma.BookingWhereInput = { hotelId };

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

    // Default sort
    const orderBy: any = {};
    if (['createdAt', 'checkIn', 'checkOut', 'totalAmount', 'status'].includes(sortBy)) {
        orderBy[sortBy] = order === 'asc' ? 'asc' : 'desc';
    } else {
        orderBy.createdAt = 'desc';
    }

    return this.prisma.booking.findMany({
      where,
      include: {
        hotel: true,
        user: true,
        roomType: true,
        room: true,
        payment: true,
      },
      orderBy,
    });
  }



  async updateStatus(bookingId: string, status: string, hotelId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.hotelId !== hotelId) throw new ForbiddenException('Booking does not belong to this hotel');

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
    const occupancyRate = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;

    // 🛎️ Check-ins / Check-outs Today
    const checkInsToday = await this.prisma.booking.count({ 
        where: { checkIn: { gte: today, lt: new Date(today.getTime() + 86400000) }, status: 'confirmed' }
    });
    const checkOutsToday = await this.prisma.booking.count({ 
        where: { checkOut: { gte: today, lt: new Date(today.getTime() + 86400000) }, status: 'checked_in' }
    });

    // 📈 Occupancy Chart (Last 7 Days)
    const occupancyChart = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
        
        // Count occupied for that specific past date
        // Note: precise inventory history might not exist, checking active bookings for that date
        const active = await this.prisma.booking.count({
             where: {
                 status: { in: ['confirmed', 'checked_in', 'checked_out'] }, // include checked_out if they stayed that night
                 checkIn: { lte: d },
                 checkOut: { gt: d }
             }
        });
        
        // Assume totalRooms is constant for trend simplicity or fetch historic if complex
        const rate = totalRooms > 0 ? Math.round((active / totalRooms) * 100) : 0;
        occupancyChart.push({ name: dayLabel, value: rate });
    }

    return {
      totalBookings,
      confirmedBookings,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      chartData, // Revenue Chart
      occupancyChart, // New Occupancy Chart
      totalRooms,
      availableRooms,
      checkInsToday,
      checkOutsToday,
      occupancyRate
    };
  }

  async getCalendarBookings(hotelId: string, month: number, year: number) {
    if (!hotelId) throw new BadRequestException('Hotel ID Required');
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const bookings = await this.prisma.booking.findMany({
      where: {
        hotelId,
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

  async getCalendarEvents(hotelId: string, start: string, end: string) {
    if (!hotelId) throw new BadRequestException('Hotel ID Required');
    const startDate = new Date(start);
    const endDate = new Date(end);

    return this.prisma.booking.findMany({
      where: {
        hotelId,
        status: { not: 'cancelled' },
        checkIn: { lt: endDate },
        checkOut: { gt: startDate }
      },
      select: {
          id: true,
          checkIn: true,
          checkOut: true,
          status: true,
          leadName: true,
          leadEmail: true,
          leadPhone: true,
          guestsAdult: true,
          guestsChild: true,
          roomId: true,
          roomTypeId: true,
          totalAmount: true,
          room: { select: { id: true, roomNumber: true } },
          roomType: { select: { name: true } },
          payment: true
      }
    });
  }
  async calculateTotalPrice(
    roomTypeId: string, 
    ratePlanId: string, 
    checkIn: Date, 
    checkOut: Date, 
    promoCode?: string
  ): Promise<number> {
      const roomType = await this.prisma.roomType.findUnique({ where: { id: roomTypeId } });
      if (!roomType) throw new NotFoundException('RoomType provided not found');

      const ratePlan = await this.prisma.ratePlan.findUnique({ where: { id: ratePlanId } });
      if (!ratePlan) throw new NotFoundException('RatePlan provided not found');

      let total = 0;
      const current = new Date(checkIn);

      // Pre-fetch overrides for the range
      const overrides = await this.prisma.rateOverride.findMany({
        where: {
          roomTypeId,
          ratePlanId,
          date: { gte: checkIn, lt: checkOut }
        }
      });
      
      const overrideMap = new Map<string, number>();
      overrides.forEach(o => overrideMap.set(o.date.toISOString().split('T')[0], o.baseRate));

      while (current < checkOut) {
          const dateKey = current.toISOString().split('T')[0];
          
          if (overrideMap.has(dateKey)) {
              total += overrideMap.get(dateKey);
          } else {
              let nightly = roomType.basePrice || 0;
              // Simple logic for Bed & Breakfast adjustment if not overridden
              // Based on seed: "standard + 300"
              if (ratePlan.includesBreakfast && !ratePlan.name.toLowerCase().includes('standard')) {
                  nightly += 300; 
              }
              total += nightly;
          }
          current.setDate(current.getDate() + 1);
      }

      // Apply Promotion
      if (promoCode) {
        const promo = await this.prisma.promotion.findUnique({ where: { code: promoCode } });
        const now = new Date();
        if (promo && promo.startDate <= now && promo.endDate >= now) {
            if (promo.type === 'percent') {
                const discount = Math.floor(total * (promo.value / 100));
                total = Math.max(0, total - discount);
            } else if (promo.type === 'fixed') {
                total = Math.max(0, total - promo.value);
            }
        }
      }

      return total;
  }


  async getDashboardStatsNew(hotelId: string, period: string = 'month') {
    if (!hotelId) throw new BadRequestException('Hotel ID is required for dashboard stats');
    const now = new Date();
    let startDate = new Date();

    if (period === 'today') startDate.setHours(0,0,0,0);
    else if (period === 'week') startDate.setDate(now.getDate() - 7);
    else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);
    else startDate = new Date(0);

    const bookings = await this.prisma.booking.findMany({
      where: {
        hotelId,
        createdAt: { gte: startDate },
        status: { not: 'cancelled' }
      }
    });

    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const checkIns = await this.prisma.booking.count({ 
        where: { hotelId, checkIn: { gte: new Date(todayStr), lt: new Date(new Date(todayStr).getTime() + 86400000) }, status: 'confirmed' } 
    });
    const checkOuts = await this.prisma.booking.count({ 
        where: { hotelId, checkOut: { gte: new Date(todayStr), lt: new Date(new Date(todayStr).getTime() + 86400000) }, status: 'confirmed' } 
    });

    const totalRooms = await this.prisma.room.count({
        where: { roomType: { hotelId } }
    });
    const activeBookings = await this.prisma.booking.count({
        where: {
            hotelId,
            checkIn: { lte: now },
            checkOut: { gt: now },
            status: { in: ['confirmed', 'checked_in'] }
        }
    });
    
    const safeTotalRooms = totalRooms > 0 ? totalRooms : 10; 
    const occupancyRate = Math.round((activeBookings / safeTotalRooms) * 100);

    const chartMap = new Map();
    bookings.forEach(b => {
        const date = new Date(b.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        chartMap.set(date, (chartMap.get(date) || 0) + b.totalAmount);
    });
    
    const chartData = Array.from(chartMap, ([name, value]) => ({ name, value }));
    const occupancyChart = []; // Fallback empty or implement logic similar to getDashboardStats if needed used by frontend.

    return {
        totalBookings,
        confirmedBookings,
        totalRevenue,
        checkInsToday: checkIns,
        checkOutsToday: checkOuts,
        totalRooms: safeTotalRooms,
        availableRooms: safeTotalRooms - activeBookings,
        occupancyRate,
        chartData,
        occupancyChart: occupancyChart.reverse()
    };
  }
}
