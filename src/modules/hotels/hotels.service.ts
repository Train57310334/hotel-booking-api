import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class HotelsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.hotel.findMany({ include: { roomTypes: true } });
  }

  find(id: string) {
    return this.prisma.hotel.findUnique({ where: { id }, include: { roomTypes: true, reviews: true } });
  }
}
