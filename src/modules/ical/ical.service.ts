import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import ical from 'ical-generator';
import nodeIcal from 'node-ical';

@Injectable()
export class IcalService {
  private readonly logger = new Logger(IcalService.name);

  constructor(private prisma: PrismaService) {}

  async generateIcal(hotelId: string): Promise<string> {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
    });

    if (!hotel) {
      throw new Error(`Hotel with ID ${hotelId} not found`);
    }

    const calendar = ical({ name: `${hotel.name} Bookings` });

    // Fetch confirmed and checked_in bookings
    const bookings = await this.prisma.booking.findMany({
      where: {
        hotelId: hotelId,
        status: { in: ['confirmed', 'checked_in'] },
      },
      include: {
        roomType: true,
        guests: true,
      },
    });

    bookings.forEach((booking) => {
      // Safely handle missing checkIn/checkOut dates just in case
      if (booking.checkIn && booking.checkOut) {
          calendar.createEvent({
            start: booking.checkIn,
            end: booking.checkOut,
            summary: `Booking for ${booking.leadName || 'Guest'} (${booking.roomType?.name || 'Room'})`,
            description: `Booking ID: ${booking.id}\nStatus: ${booking.status}\nGuests: ${JSON.stringify(booking.guests)}`,
            location: hotel.name,
            url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/manage-booking?id=${booking.id}`,
            organizer: { name: hotel.name, email: 'noreply@hotel.com' },
          });
      }
    });

    return calendar.toString();
  }

  // Runs every 30 minutes
  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncExternalIcal() {
    this.logger.log('Starting External iCal Synchronization...');
    try {
        const roomTypes = await this.prisma.roomType.findMany({
            where: {
                icalUrl: { not: null }
            },
            include: {
                hotel: true,
                ratePlans: true
            }
        });

        let syncedCount = 0;

        for (const roomType of roomTypes) {
             const url = roomType.icalUrl;
             if (!url) continue;

             try {
                 // Fetch and Parse standard iCal from the external URL
                 const events = await nodeIcal.async.fromURL(url);

                 for (const eventId in events) {
                      const event = events[eventId];
                      if (event.type === 'VEVENT') {
                           const start = event.start as Date;
                           const end = event.end as Date;
                           if (!event.uid) continue;
                           const uid = (typeof event.uid === 'object' && event.uid !== null) ? (event.uid as any).val : event.uid;
                           const summary = typeof event.summary === 'object' ? (event.summary as any).val : event.summary;

                           if (!start || !end) continue;

                           // Skip past events to save DB writes
                           if (end < new Date()) continue;

                           // We represent blocked OTAs as a "mock" confirmed booking
                           // with a special identifier in the guest name or notes.
                           const externalRef = `OTA-SYNC-${uid}`;

                           // Check if we already synced this specific event
                           const existing = await this.prisma.booking.findFirst({
                               where: {
                                    roomTypeId: roomType.id,
                                    notes: { contains: externalRef }
                               }
                           });

                           if (!existing) {
                               await this.prisma.booking.create({
                                    data: {
                                         hotelId: roomType.hotelId,
                                         roomTypeId: roomType.id,
                                         ratePlanId: roomType.ratePlans?.[0]?.id || 'unknown', // Fallback if no rate plan loaded
                                         status: 'confirmed', // Block inventory
                                         checkIn: start,
                                         checkOut: end,
                                         guestsAdult: 0,
                                         guestsChild: 0,
                                         leadName: summary || 'External Booking',
                                         leadEmail: 'ota@sync.local',
                                         leadPhone: '-',
                                         totalAmount: 0,
                                         source: 'OTA',
                                         notes: `[DO NOT DELETE] ${externalRef}\nImported via iCal Sync from ${url}`
                                    }
                               });
                               syncedCount++;
                           }
                      }
                 }
                 this.logger.log(`Synced RoomType ${roomType.name}: OK`);

             } catch (fetchErr: any) {
                 this.logger.error(`Failed to sync URL ${url} for RoomType ${roomType.name}: ${fetchErr.message}`);
             }
        }

        this.logger.log(`iCal Sync Completed. Synced ${syncedCount} new external bookings.`);

    } catch (e: any) {
        this.logger.error(`Fatal error in syncExternalIcal: ${e.message}`);
    }
  }
}
