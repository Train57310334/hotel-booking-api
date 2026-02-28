import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RoomStatus } from '@prisma/client';

@Injectable()
export class HousekeepingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all physical rooms and their current statuses, grouped by RoomType
   * This is heavily optimized for a single-page housekeeping dashboard view.
   */
  async getHousekeepingStatus(hotelId: string) {
    // 1. Validate hotel
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId }
    });
    if (!hotel) {
      throw new NotFoundException(`Hotel with ID ${hotelId} not found`);
    }

    // 2. Fetch RoomTypes and their Rooms
    const roomTypes = await this.prisma.roomType.findMany({
      where: { hotelId },
      include: {
        rooms: {
          include: {
            statusLogs: {
              orderBy: { createdAt: 'desc' },
              take: 1, // Get the latest log for details (who updated, notes)
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                }
              }
            },
            // Include active bookings to know if the room is occupied
            bookings: {
              where: {
                status: { in: ['checked_in'] },
              },
              take: 1
            }
          },
          orderBy: {
            roomNumber: 'asc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // 3. Format the response for the frontend Kanban/List view
    const formattedData = roomTypes.map(rt => {
      return {
        id: rt.id,
        name: rt.name,
        bedConfig: rt.bedConfig,
        rooms: rt.rooms.map(room => {
          const isOccupied = room.bookings.length > 0;
          const latestLog = room.statusLogs[0];
          
          return {
            id: room.id,
            roomNumber: room.roomNumber,
            status: room.status,
            isOccupied,
            lastStatusUpdate: latestLog ? {
              updatedAt: latestLog.createdAt,
              updatedBy: latestLog.user?.name || 'System',
              note: latestLog.note
            } : null,
            currentGuest: isOccupied ? room.bookings[0].leadName : null,
            checkOutDate: isOccupied ? room.bookings[0].checkOut : null,
          };
        })
      };
    });

    return formattedData;
  }

  /**
   * Updates an individual room's physical status and logs it.
   */
  async updateRoomStatus(roomId: string, status: RoomStatus, userId?: string, note?: string) {
    // 1. Verify Room exists
    const room = await this.prisma.room.findUnique({
      where: { id: roomId }
    });
    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }

    // 2. Perform the update and create a log atomically
    const updatedRoom = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.room.update({
        where: { id: roomId },
        data: { status }
      });

      await tx.roomStatusLog.create({
        data: {
          roomId,
          status,
          updatedBy: userId || null,
          note: note || null,
        }
      });

      return updated;
    });

    return updatedRoom;
  }
}
