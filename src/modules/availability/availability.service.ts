import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async check(hotelId: string, checkIn: Date, checkOut: Date) {
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkIn >= checkOut) {
      return [];
    }

    const roomTypes = await this.prisma.roomType.findMany({ 
      where: { hotelId, deletedAt: null },
      include: {
        rooms: { where: { deletedAt: null } }
      }
    });

    const activeBookings = await this.prisma.booking.findMany({
      where: {
        hotelId,
        status: { notIn: ['cancelled', 'failed', 'no_show'] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn }
      }
    });

    const inventories = await this.prisma.inventoryCalendar.findMany({
      where: {
        roomType: { hotelId },
        date: { gte: checkIn, lt: checkOut }
      }
    });

    const diffDays = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));

    return roomTypes.map(rt => {
      let baseAllotment = rt.rooms.length;
      let minStayRequired = 1;
      let stopSale = false;

      for (let i = 0; i < diffDays; i++) {
          const currentDate = new Date(checkIn);
          currentDate.setDate(currentDate.getDate() + i);
          const dateStr = currentDate.toISOString().split('T')[0];
          
          const inv = inventories.find(v => 
            v.roomTypeId === rt.id && 
            v.date.toISOString().split('T')[0] === dateStr
          );

          if (inv) {
            if (inv.stopSale) stopSale = true;
            if (inv.minStay > minStayRequired) minStayRequired = inv.minStay;
            if (inv.allotment !== null && inv.allotment < baseAllotment) {
              // If specific day caps allotment lower than physical limit
              baseAllotment = inv.allotment;
            }
          }
      }

      // Improved Daily-based Availability Logic
      let minAvailableInPeriod = baseAllotment;

      for (let i = 0; i < diffDays; i++) {
          const currentDate = new Date(checkIn);
          currentDate.setDate(currentDate.getDate() + i);
          const nextDate = new Date(currentDate);
          nextDate.setDate(nextDate.getDate() + 1);

          // Count bookings overlapping this specific day
          const bookedOnThisDay = activeBookings.filter(b => 
            b.roomTypeId === rt.id &&
            b.checkIn < nextDate && 
            b.checkOut > currentDate
          ).length;

          const availableOnThisDay = Math.max(0, baseAllotment - bookedOnThisDay);
          if (availableOnThisDay < minAvailableInPeriod) {
            minAvailableInPeriod = availableOnThisDay;
          }
      }

      const available = minAvailableInPeriod;

      return {
        roomTypeId: rt.id,
        availableAllotment: available,
        minStay: minStayRequired,
        stopSale: stopSale || diffDays < minStayRequired || available === 0,
        ratePlans: []
      };
    });
  }
}
