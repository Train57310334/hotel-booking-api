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

  /** 🏨 สร้างการจองใหม่ */
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
}
