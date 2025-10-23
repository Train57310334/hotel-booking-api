import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    // TODO: Use transaction & SELECT FOR UPDATE equivalent via Prisma when needed
    const booking = await this.prisma.booking.create({ data: {
      hotelId: data.hotelId,
      roomTypeId: data.roomTypeId,
      ratePlanId: data.ratePlanId,
      checkIn: new Date(data.checkIn),
      checkOut: new Date(data.checkOut),
      guestsAdult: data.guests?.adult ?? 2,
      guestsChild: data.guests?.child ?? 0,
      totalAmount: data.totalAmount ?? 0,
      status: 'pending',
      leadName: data.leadGuest?.name ?? 'Guest',
      leadEmail: data.leadGuest?.email ?? 'guest@example.com',
      leadPhone: data.leadGuest?.phone ?? '',
      specialRequests: data.specialRequests ?? null
    }});
    return booking;
  }

  find(id: string) {
    return this.prisma.booking.findUnique({ where: { id }, include: { hotel: true, roomType: true, ratePlan: true, payment: true } });
  }
}
