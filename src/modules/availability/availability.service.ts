import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async check(hotelId: string, checkIn: Date, checkOut: Date) {
    // TODO: add real logic for stop-sale/min-stay/aggregation per room type
    const roomTypes = await this.prisma.roomType.findMany({ where: { hotelId } });
    return roomTypes.map(rt => ({
      roomTypeId: rt.id,
      availableAllotment: 5,
      minStay: 1,
      stopSale: false,
      ratePlans: []
    }));
  }
}
