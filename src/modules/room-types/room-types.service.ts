import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RoomTypesService {
  constructor(private prisma: PrismaService) {}
  listByHotel(hotelId: string) {
    return this.prisma.roomType.findMany({ where: { hotelId } });
  }
}
