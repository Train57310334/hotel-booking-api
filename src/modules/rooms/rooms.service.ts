import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
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
               checkOut: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
           },
           orderBy: { checkIn: 'asc' },
           take: 5
        },
        statusLogs: {
            orderBy: { createdAt: 'desc' },
            take: 1
        }
      },
      orderBy: { roomNumber: 'asc' } // or number if added
    });
  }

  async getAvailableRooms(roomTypeId: string, checkIn: string, checkOut: string) {
      if (!roomTypeId || !checkIn || !checkOut) {
          return [];
      }

      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);

      // Find all rooms of this type
      const rooms = await this.prisma.room.findMany({
          where: { roomTypeId, deletedAt: null },
          orderBy: { roomNumber: 'asc' }
      });

      // Find conflicting bookings for these dates
      const conflictingBookings = await this.prisma.booking.findMany({
          where: {
              roomTypeId: roomTypeId,
              status: { in: ['confirmed', 'checked_in'] },
              roomId: { not: null }, // Only care about assigned rooms
              checkIn: { lt: checkOutDate }, // Overlaps
              checkOut: { gt: checkInDate }
          },
          select: { roomId: true }
      });

      const conflictingRoomIds = new Set(conflictingBookings.map(b => b.roomId));

      // Fetch the latest status of each room to prefer CLEAN rooms
      // In this basic schema, we might not have a strong 'status' column on Room directly,
      // but let's see if we have `statusLogs` or similar. Let's assume Room has 'status' or we check logs
      const roomIds = rooms.map(r => r.id);
      const latestStatusLogs = await this.prisma.roomStatusLog.findMany({
          where: { roomId: { in: roomIds } },
          orderBy: { createdAt: 'desc' },
          distinct: ['roomId']
      });

      const statusMap = new Map();
      latestStatusLogs.forEach(log => statusMap.set(log.roomId, log.status));

      // Filter and format
      return rooms
          .filter(room => !conflictingRoomIds.has(room.id))
          .map(room => {
               // Prefer the explicitly tracked status, default to assumed CLEAN
               const status = statusMap.get(room.id) || 'CLEAN';
               return {
                   ...room,
                   status
               };
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

      const maxRooms = roomType.hotel.maxRooms;
      
      if (currentRoomCount >= maxRooms) {
          throw new ConflictException(`Your plan is limited to ${maxRooms} rooms. Please upgrade your plan for more rooms.`);
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

    const maxRooms = roomType.hotel.maxRooms;

    if ((currentRoomCount + count) > maxRooms) {
        throw new ConflictException(`Your plan is limited to ${maxRooms} rooms. You have ${currentRoomCount} rooms and are trying to add ${count} more.`);
    }

    const roomsToCreate = [];
    
    for (let i = 0; i < count; i++) {
      roomsToCreate.push({
        roomTypeId,
        roomNumber: `${prefix}${startNumber + i}`,
      });
    }

    try {
      // Using createMany for better performance
      return await this.prisma.room.createMany({
        data: roomsToCreate,
        skipDuplicates: true, // Safety skip
      });
    } catch (error) {
       console.error("Bulk Room Creation Error:", error);
       throw new BadRequestException("Failed to create rooms. Some room numbers may already exist.");
    }
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
