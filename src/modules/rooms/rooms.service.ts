import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string, hotelId?: string) {
    const where: any = {
      deletedAt: null, // Filter out deleted rooms
    };

    if (hotelId) {
      where.roomType = {
        hotelId: hotelId
      };
    }
    
    // In real app, search by room number or typelike
    // Since Room entity in current schema just has 'id' and 'roomTypeId',
    // We assume we might add 'roomNumber' or similar later.
    // For now, listing all is fine.
    
    return this.prisma.room.findMany({
      where,
      include: {
        roomType: true,
        bookings: {
           where: {
               status: { in: ['confirmed', 'checked_in'] },
               checkIn: { lte: new Date() },
               checkOut: { gt: new Date() }
           },
           take: 1
        },
        statusLogs: {
            orderBy: { createdAt: 'desc' },
            take: 1
        }
      },
      orderBy: { roomNumber: 'asc' } // or number if added
    });
  }

  async create(data: any) {
    // data.roomTypeId is required
    try {
      // 1. Check Package Limits
      const roomType = await this.prisma.roomType.findUnique({
        where: { id: data.roomTypeId },
        include: { hotel: true }
      });

      if (!roomType) throw new NotFoundException('Room Type not found');

      // Count all rooms for this hotel (across all types)
      const currentRoomCount = await this.prisma.room.count({
        where: {
            roomType: { hotelId: roomType.hotelId },
            deletedAt: null
        }
      });

      const pkg = roomType.hotel.package; // LITE, PRO, ENTERPRISE
      
      if (pkg === 'LITE' && currentRoomCount >= 5) {
          throw new ConflictException('LITE Plan is limited to 5 rooms. Please upgrade to PRO for unlimited rooms.');
      }

      return await this.prisma.room.create({
        data: {
          roomTypeId: data.roomTypeId,
          roomNumber: data.roomNumber,
        }
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Room number already exists');
      }
      throw error;
    }
  }

  async createBulk(data: { roomTypeId: string; prefix?: string; startNumber: number; count: number }) {
    const { roomTypeId, prefix = '', startNumber, count } = data;

    // 1. Check Package Limits
    const roomType = await this.prisma.roomType.findUnique({
        where: { id: roomTypeId },
        include: { hotel: true }
    });

    if (!roomType) throw new NotFoundException('Room Type not found');

    const currentRoomCount = await this.prisma.room.count({
        where: {
            roomType: { hotelId: roomType.hotelId },
            deletedAt: null
        }
    });

    const pkg = roomType.hotel.package;

    if (pkg === 'LITE' && (currentRoomCount + count) > 5) {
        throw new ConflictException(`LITE Plan is limited to 5 rooms. You have ${currentRoomCount} rooms and are trying to add ${count} more.`);
    }

    const roomsToCreate = [];
    
    for (let i = 0; i < count; i++) {
      roomsToCreate.push({
        roomTypeId,
        roomNumber: `${prefix}${startNumber + i}`,
      });
    }

    // Using createMany for better performance
    return this.prisma.room.createMany({
      data: roomsToCreate,
      skipDuplicates: true, // Safety skip
    });
  }

  async findOne(id: string) {
    const room = await this.prisma.room.findFirst({
      where: { id, deletedAt: null },
      include: { roomType: true }
    });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async update(id: string, data: any) {
    try {
      return await this.prisma.room.update({
        where: { id },
        data: {
          roomTypeId: data.roomTypeId,
          roomNumber: data.roomNumber
        }
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Room number already exists');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException(`Room with ID ${id} not found or Room Type ${data.roomTypeId} invalid.`);
      }
      throw error;
    }
  }

  async remove(id: string) {
    // Soft Delete: Mark as deleted instead of actual delete
    return this.prisma.room.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  async updateStatus(id: string, status: any, userId?: string, note?: string) {
    // Create Log
    await this.prisma.roomStatusLog.create({
        data: {
            roomId: id,
            status: status,
            updatedBy: userId,
            note: note
        }
    });

    return this.prisma.room.update({
      where: { id },
      data: { status }
    });
  }
}
