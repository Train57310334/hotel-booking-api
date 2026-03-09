import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class NightAuditService {
  private readonly logger = new Logger(NightAuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 🌙 Night Audit: Runs every day at 02:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleNightAudit() {
    this.logger.log('🌙 Starting Night Audit...');

    try {
      await this.autoMarkNoShow();
      await this.generateDailySnapshot();
      await this.databaseCleanup();
      this.logger.log('✅ Night Audit Completed Successfully.');
    } catch (e) {
      this.logger.error('❌ Night Audit Failed', e);
    }
  }

  /**
   * 1. Mark 'confirmed' bookings as 'no_show' if check-in date passed
   */
  // ✅ BUG #14 FIX: Restore inventory for no-show bookings
  async autoMarkNoShow() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Midnight start of today

    // Find confirmed bookings where CheckIn Date < Today
    // (Meaning they should have arrived yesterday or earlier)
    const lateBookings = await this.prisma.booking.findMany({
      where: {
        status: 'confirmed',
        checkIn: {
          lt: today
        }
      }
    });

    if (lateBookings.length > 0) {
      this.logger.log(`Found ${lateBookings.length} bookings to mark as NO_SHOW.`);
      
      const ids = lateBookings.map(b => b.id);
      
      const result = await this.prisma.booking.updateMany({
        where: { id: { in: ids } },
        data: { status: 'no_show' }
      });

      // ✅ BUG #14 FIX: Release inventory for no-show bookings so rooms can be re-sold
      for (const booking of lateBookings) {
        try {
          const dateRange: Date[] = [];
          let d = new Date(booking.checkIn);
          while (d < new Date(booking.checkOut)) {
            dateRange.push(new Date(d));
            d.setDate(d.getDate() + 1);
          }

          const totalRooms = await this.prisma.room.count({ where: { roomTypeId: booking.roomTypeId, deletedAt: null } });
          for (const date of dateRange) {
            const record = await this.prisma.inventoryCalendar.findUnique({
              where: { roomTypeId_date: { roomTypeId: booking.roomTypeId, date } }
            });
            if (record) {
              const restored = Math.min(record.allotment + 1, totalRooms > 0 ? totalRooms : record.allotment + 1);
              await this.prisma.inventoryCalendar.update({
                where: { roomTypeId_date: { roomTypeId: booking.roomTypeId, date } },
                data: { allotment: restored }
              });
            }
          }
        } catch (e) {
          this.logger.error(`Failed to restore inventory for no-show booking ${booking.id}`, e);
        }
      }
      
      this.logger.log(`Updated ${result.count} bookings to NO_SHOW and released their inventory.`);
    } else {
       this.logger.log('No bookings to mark as NO_SHOW.');
    }
  }

  /**
   * 2. Generate Daily Snapshot Stats
   */
  async generateDailySnapshot() {
      // We are running at 2AM, so we are auditing "Yesterday"
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0); // Start of Yesterday

      // End of Yesterday (for range query)
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);

      this.logger.log(`📊 Generating Snapshot for ${yesterday.toISOString().split('T')[0]}`);

      // 1. Find Occupied Bookings for Yesterday (CHECKED_IN status with overlap)
      const activeBookings = await this.prisma.booking.findMany({
          where: {
              status: 'checked_in',
              // Overlap Logic: CheckIn <= Yesterday AND CheckOut > Yesterday
              checkIn: { lte: yesterdayEnd },
              checkOut: { gt: yesterday }
          },
          select: {
            id: true,
            hotelId: true,
            checkIn: true,
            checkOut: true,
            roomTypeId: true,
            totalAmount: true,
          }
      });

      // ✅ BUG #8 FIX: Count rooms scoped to hotels that had active bookings — not all hotels
      const hotelIds = [...new Set(activeBookings.map(b => b.hotelId).filter(Boolean))];
      const totalRooms = await this.prisma.room.count({
          where: { 
            deletedAt: null,
            roomType: hotelIds.length > 0 ? { hotelId: { in: hotelIds } } : undefined
          }
      });

      const occupiedRooms = activeBookings.length;

      // 3. Calculate Revenue for Yesterday
      // Simple Logic: TotalBookingAmount / Nights
      let dailyRevenue = 0;
      for (const booking of activeBookings) {
          const nights = Math.max(1, Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)));
          dailyRevenue += (booking.totalAmount || 0) / nights;
      }

      // 4. Metrics
      const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
      const adr = occupiedRooms > 0 ? dailyRevenue / occupiedRooms : 0;
      const revPar = totalRooms > 0 ? dailyRevenue / totalRooms : 0;

      // 5. Save to DB
      await this.prisma.dailyStat.upsert({
          where: { date: yesterday },
          update: {
              totalRevenue: dailyRevenue,
              totalBookings: activeBookings.length,
              occupiedRooms,
              occupancyRate,
              adr,
              revPar
          },
          create: {
              date: yesterday,
              totalRevenue: dailyRevenue,
              totalBookings: activeBookings.length,
              occupiedRooms,
              occupancyRate,
              adr,
              revPar
          }
      });

      this.logger.log(`✅ Snapshot Saved: Occupancy=${occupancyRate.toFixed(1)}%, ADR=${adr.toFixed(2)}, RevPAR=${revPar.toFixed(2)}`);
  }

  /**
   * 3. Clean up soft-deleted records and expired sessions
   */
  async databaseCleanup() {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      this.logger.log('🧹 Starting Database Cleanup (Garbage Collection)...');

      try {
          // 1. Hard delete Rooms that were soft-deleted > 30 days ago
          const deletedRooms = await this.prisma.room.deleteMany({
              where: {
                  deletedAt: { lte: thirtyDaysAgo }
              }
          });
          if (deletedRooms.count > 0) this.logger.log(`Deleted ${deletedRooms.count} old soft-deleted rooms.`);

          // 2. Hard delete RoomTypes that were soft-deleted > 30 days ago 
          // (Since rooms cascade, rooms are already handled or deleted first)
          const deletedRoomTypes = await this.prisma.roomType.deleteMany({
              where: {
                  deletedAt: { lte: thirtyDaysAgo }
              }
          });
          if (deletedRoomTypes.count > 0) this.logger.log(`Deleted ${deletedRoomTypes.count} old soft-deleted room types.`);

          // 3. Delete Expired BookingDrafts (Session) > 1 day old
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          
          const deletedDrafts = await this.prisma.bookingDraft.deleteMany({
              where: {
                  expiresAt: { lte: yesterday }
              }
          });
          if (deletedDrafts.count > 0) this.logger.log(`Deleted ${deletedDrafts.count} expired booking drafts.`);

          this.logger.log('✅ Database Cleanup Completed.');
      } catch (e) {
          this.logger.error('❌ Database Cleanup Failed', e);
      }
  }
}
