import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { IcalService } from '../ical/ical.service';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly icalService: IcalService,
  ) {}

  /**
   * Returns all room types for the hotel with their iCal connection status
   */
  async getChannelStatus(hotelId: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { id: true, name: true },
    });
    if (!hotel) throw new NotFoundException('Hotel not found');

    const roomTypes = await this.prisma.roomType.findMany({
      where: { hotelId, deletedAt: null },
      select: {
        id: true,
        name: true,
        icalUrl: true,
        icalLastSyncedAt: true,
      },
      orderBy: { name: 'asc' },
    });

    // Outbound iCal feed URL for this hotel
    const outboundUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/ical/${hotelId}`;

    return {
      hotel,
      outboundUrl,
      roomTypes: roomTypes.map((rt) => ({
        id: rt.id,
        name: rt.name,
        icalUrl: rt.icalUrl || null,
        isConnected: !!rt.icalUrl,
        lastSyncedAt: rt.icalLastSyncedAt || null,
      })),
    };
  }

  /**
   * Save or clear the iCal URL for a specific room type
   */
  async updateIcalUrl(roomTypeId: string, url: string | null) {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });
    if (!roomType) throw new NotFoundException('Room type not found');

    const updated = await this.prisma.roomType.update({
      where: { id: roomTypeId },
      data: {
        icalUrl: url || null,
        // If disconnecting, clear the sync timestamp too
        icalLastSyncedAt: url ? roomType.icalLastSyncedAt : null,
      },
      select: { id: true, name: true, icalUrl: true, icalLastSyncedAt: true },
    });

    // If disconnecting, clean up orphaned OTA-SYNC bookings for this room type
    if (!url) {
      await this.prisma.booking.deleteMany({
        where: {
          roomTypeId,
          source: 'OTA',
          notes: { contains: 'OTA-SYNC-' },
        },
      });
    }

    return {
      id: updated.id,
      name: updated.name,
      icalUrl: updated.icalUrl,
      isConnected: !!updated.icalUrl,
      lastSyncedAt: updated.icalLastSyncedAt,
    };
  }

  /**
   * Manually trigger a sync for all room types of a specific hotel
   */
  async triggerSync(hotelId: string) {
    await this.icalService.syncForHotel(hotelId);
    return { success: true, message: 'iCal sync triggered successfully.' };
  }
}
