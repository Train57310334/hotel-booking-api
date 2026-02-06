import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class GuestsService {
  constructor(private prisma: PrismaService) {}

  async addGuest(data: any) {
    try {
      return await this.prisma.guest.create({
        data: {
          bookingId: data.bookingId,
          name: data.name,
          idType: data.idType,
          idNumber: data.idNumber,
          documentUrl: data.documentUrl,
        },
      });
    } catch (error) {
      console.error('Error adding guest:', error);
      throw new Error(`Failed to add guest: ${error.message}`);
    }
  }

  async removeGuest(id: string) {
    return this.prisma.guest.delete({
      where: { id },
    });
  }
}
