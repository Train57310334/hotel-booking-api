import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RoomTypesService {
  constructor(private prisma: PrismaService) {}
  listByHotel(hotelId: string) {
    return this.prisma.roomType.findMany({ 
      where: { hotelId, deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
  }

  findAll() {
    return this.prisma.roomType.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        hotel: true,
        ratePlans: true,
        rooms: {
            where: { deletedAt: null }
        } // Including rooms here too for simpler selection
      }
    });
  }
  
  findOne(id: string) { return this.prisma.roomType.findFirst({ where: { id, deletedAt: null } }); }

  async create(data: any) {
    try {
      const { price, ...rest } = data;
      return await this.prisma.roomType.create({
        data: {
          ...rest,
          basePrice: price ? Number(price) : undefined,
        },
      });
    } catch (e) {
      console.error(e);
      throw new BadRequestException(e.message);
    }
  }

  async update(id: string, data: any) {
    try {
      const { price, id: _, ...rest } = data; // Strip ID and extract price
      return await this.prisma.roomType.update({
        where: { id },
        data: {
            ...rest,
            ...(price !== undefined ? { basePrice: Number(price) } : {})
        }
      });
    } catch (e) {
      console.error(e);
      throw new BadRequestException(e.message);
    }
  }

  remove(id: string) { 
      // Soft Delete
      return this.prisma.roomType.update({ 
          where: { id }, 
          data: { deletedAt: new Date() } 
      }); 
  }
}
