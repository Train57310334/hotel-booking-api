import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { IcalService } from '../ical/ical.service';

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);

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
        channelManagerRoomId: true,
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
        isConnected: !!rt.icalUrl || !!rt.channelManagerRoomId,
        lastSyncedAt: rt.icalLastSyncedAt || null,
        channelManagerRoomId: rt.channelManagerRoomId || '',
      })),
    };
  }

  /**
   * Save or clear the iCal URL and Channel Manager ID for a specific room type
   */
  async updateRoomMapping(roomTypeId: string, data: { url?: string | null, channelManagerRoomId?: string | null }) {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });
    if (!roomType) throw new NotFoundException('Room type not found');

    const updated = await this.prisma.roomType.update({
      where: { id: roomTypeId },
      data: {
        ...(data.url !== undefined && { icalUrl: data.url || null }),
        // If disconnecting iCal, clear the sync timestamp too
        ...(data.url !== undefined && { icalLastSyncedAt: data.url ? roomType.icalLastSyncedAt : null }),
        ...(data.channelManagerRoomId !== undefined && { channelManagerRoomId: data.channelManagerRoomId || null }),
      },
      select: { id: true, name: true, icalUrl: true, icalLastSyncedAt: true, channelManagerRoomId: true },
    });

    // If disconnecting iCal, clean up orphaned OTA-SYNC bookings for this room type
    if (data.url === null) {
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
      isConnected: !!updated.icalUrl || !!updated.channelManagerRoomId,
      lastSyncedAt: updated.icalLastSyncedAt,
      channelManagerRoomId: updated.channelManagerRoomId,
    };
  }

  /**
   * Manually trigger a sync for all room types of a specific hotel
   */
  async triggerSync(hotelId: string) {
    await this.icalService.syncForHotel(hotelId);
    return { success: true, message: 'iCal sync triggered successfully.' };
  }

  /**
   * Process incoming webhook from Channel Manager (e.g. Channex, SiteMinder)
   */
  async processWebhook(payload: any) {
    this.logger.log(`Received Webhook: ${JSON.stringify(payload)}`);

    if (payload.event === 'booking_new' || payload.event === 'booking_modification') {
      return this.handleNewOrModifiedBooking(payload.booking);
    }
    
    if (payload.event === 'booking_cancellation') {
      return this.handleBookingCancellation(payload.booking);
    }

    return { success: true, message: 'Event ignored' };
  }

  private async handleNewOrModifiedBooking(bookingData: any) {
    // Expected minimal payload:
    // { otaReferenceId, channelName, hotelId, roomTypeId, ratePlanId, checkIn, checkOut, guestsAdult, guestsChild, totalAmount, leadName, leadEmail, leadPhone }
    
    // 1. Resolve local entities from Channel Manager Mapping IDs
    const hotel = await this.prisma.hotel.findFirst({
      where: { channelManagerId: bookingData.hotelId }
    });
    if (!hotel) throw new BadRequestException(`Unmapped Hotel ID: ${bookingData.hotelId}`);

    const roomType = await this.prisma.roomType.findFirst({
      where: { channelManagerRoomId: bookingData.roomTypeId, hotelId: hotel.id }
    });
    if (!roomType) throw new BadRequestException(`Unmapped RoomType ID: ${bookingData.roomTypeId}`);

    const ratePlan = bookingData.ratePlanId ? await this.prisma.ratePlan.findFirst({
      where: { channelManagerRateId: bookingData.ratePlanId, hotelId: hotel.id }
    }) : null;

    const checkIn = new Date(bookingData.checkIn);
    const checkOut = new Date(bookingData.checkOut);

    // 2. Transaction to create booking and reduce inventory
    const result = await this.prisma.$transaction(async (tx) => {
      // Check if booking already exists
      const existing = await tx.booking.findFirst({
        where: { otaReferenceId: bookingData.otaReferenceId }
      });

      if (existing) {
        // If it's a modification, we would handle date/room changes here.
        // For Phase 1, we just return the existing.
        return existing;
      }

      // Create Booking
      const newBooking = await tx.booking.create({
        data: {
          hotelId: hotel.id,
          roomTypeId: roomType.id,
          ratePlanId: ratePlan?.id,
          checkIn,
          checkOut,
          guestsAdult: bookingData.guestsAdult || 1,
          guestsChild: bookingData.guestsChild || 0,
          totalAmount: bookingData.totalAmount || 0,
          status: 'confirmed', // OTAs send confirmed bookings
          leadName: bookingData.leadName || 'OTA Guest',
          leadEmail: bookingData.leadEmail || 'ota@example.com',
          leadPhone: bookingData.leadPhone || '',
          source: 'OTA',
          channelName: bookingData.channelName || 'OTA',
          otaReferenceId: bookingData.otaReferenceId,
          notes: `Created via Channel Manager Webhook. Ref: ${bookingData.otaReferenceId}`
        }
      });

      // Reduce Inventory
      const dateRange: Date[] = [];
      let d = new Date(checkIn);
      while (d < checkOut) {
        dateRange.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }

      for (const date of dateRange) {
        const inv = await tx.inventoryCalendar.findFirst({
          where: { roomTypeId: roomType.id, date }
        });
        if (inv) {
          await tx.inventoryCalendar.update({
            where: { id: inv.id },
            data: { allotment: { decrement: 1 } }
          });
        } else {
          // If no row exists, we assume total physical rooms minus 1
          const totalRooms = await tx.room.count({ where: { roomTypeId: roomType.id, deletedAt: null, status: { not: 'OOO' } } });
          await tx.inventoryCalendar.create({
            data: {
              roomTypeId: roomType.id,
              date,
              allotment: Math.max(0, totalRooms - 1),
              stopSale: false,
              minStay: 1
            }
          });
        }
      }

      return newBooking;
    });

    return { success: true, bookingId: result.id };
  }

  private async handleBookingCancellation(bookingData: any) {
    const existing = await this.prisma.booking.findFirst({
      where: { otaReferenceId: bookingData.otaReferenceId }
    });

    if (!existing || existing.status === 'cancelled') {
      return { success: true, message: 'Booking already cancelled or not found' };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: existing.id },
        data: { status: 'cancelled' }
      });

      // Restore inventory
      const dateRange: Date[] = [];
      let d = new Date(existing.checkIn);
      while (d < existing.checkOut) {
        dateRange.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }

      for (const date of dateRange) {
        const inv = await tx.inventoryCalendar.findFirst({
          where: { roomTypeId: existing.roomTypeId, date }
        });
        if (inv) {
          await tx.inventoryCalendar.update({
            where: { id: inv.id },
            data: { allotment: { increment: 1 } }
          });
        }
      }
    });

    return { success: true, message: 'Booking cancelled and inventory restored' };
  }

  // ===========================================================================
  // OUTBOUND PUSH (Syncing TO Channel Manager)
  // ===========================================================================

  /**
   * Push an inventory (allotment) update to the Channel Manager.
   * This should be called asynchronously (fire-and-forget) by other services.
   */
  async pushInventoryUpdate(roomTypeId: string, dates: string[]) {
    try {
      const roomType = await this.prisma.roomType.findUnique({
        where: { id: roomTypeId },
        include: { hotel: true }
      });

      if (!roomType || !roomType.channelManagerRoomId || !roomType.hotel.channelManagerId) {
        return; // Not mapped to a channel manager, skip sync
      }

      this.logger.log(`[ChannelManager] Pushing inventory update for RoomType ${roomTypeId} on ${dates.length} dates...`);

      const payload = {
        hotel_id: roomType.hotel.channelManagerId,
        room_type_id: roomType.channelManagerRoomId,
        updates: [] as any[]
      };

      const totalRooms = await this.prisma.room.count({
        where: { roomTypeId, deletedAt: null, status: { not: 'OOO' } }
      });

      for (const dateStr of dates) {
        const dateObj = new Date(dateStr);
        const inv = await this.prisma.inventoryCalendar.findFirst({
          where: { roomTypeId, date: dateObj }
        });

        const allotment = inv ? inv.allotment : totalRooms;
        
        payload.updates.push({
          date: dateStr,
          allotment: allotment,
          stop_sale: inv ? inv.stopSale : false
        });
      }

      // Mock HTTP request to Channel Manager API
      this.logger.debug(`[ChannelManager API Payload]: ${JSON.stringify(payload)}`);
      // await axios.post('https://api.channex.io/v1/availability', payload, { headers: { 'x-api-key': '...' } });
      
    } catch (e) {
      this.logger.error(`[ChannelManager] Failed to push inventory update: ${e.message}`);
    }
  }

  /**
   * Push a rate (price) update to the Channel Manager.
   * This should be called asynchronously by the Rates/Yield service.
   */
  async pushRateUpdate(roomTypeId: string, ratePlanId: string, dates: string[]) {
    try {
      const roomType = await this.prisma.roomType.findUnique({
        where: { id: roomTypeId },
        include: { hotel: true }
      });
      const ratePlan = await this.prisma.ratePlan.findUnique({
        where: { id: ratePlanId }
      });

      if (!roomType || !roomType.channelManagerRoomId || !roomType.hotel.channelManagerId || !ratePlan || !ratePlan.channelManagerRateId) {
        return; // Not mapped
      }

      this.logger.log(`[ChannelManager] Pushing rate update for RatePlan ${ratePlanId} on ${dates.length} dates...`);

      const payload = {
        hotel_id: roomType.hotel.channelManagerId,
        room_type_id: roomType.channelManagerRoomId,
        rate_plan_id: ratePlan.channelManagerRateId,
        updates: [] as any[]
      };

      for (const dateStr of dates) {
        const dateObj = new Date(dateStr);
        const override = await this.prisma.rateOverride.findFirst({
          where: { roomTypeId, ratePlanId, date: dateObj }
        });

        // Price logic: If there's an override, use it. Else use base rate + breakfast (simplified)
        const price = override ? override.baseRate : (roomType.basePrice || 0) + (ratePlan.includesBreakfast ? (ratePlan.breakfastPrice || 0) : 0);

        payload.updates.push({
          date: dateStr,
          rate: price
        });
      }

      // Mock HTTP request
      this.logger.debug(`[ChannelManager API Payload]: ${JSON.stringify(payload)}`);
      // await axios.post('https://api.channex.io/v1/restrictions', payload, { headers: { 'x-api-key': '...' } });

    } catch (e) {
      this.logger.error(`[ChannelManager] Failed to push rate update: ${e.message}`);
    }
  }
}
