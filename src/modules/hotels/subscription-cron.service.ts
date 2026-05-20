import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSubscriptionExpirations() {
    this.logger.log('Starting daily check for expired subscriptions...');

    const now = new Date();

    try {
      // Find all hotels that are on a paid plan but their subscription has expired
      const expiredHotels = await this.prisma.hotel.findMany({
        where: {
          package: { not: 'LITE' },
          subscriptionEnd: { lt: now },
          subscriptionStatus: { not: 'expired' }, // Don't re-process already expired
        },
        select: {
          id: true,
          name: true,
          package: true,
          subscriptionStatus: true,
        }
      });

      if (expiredHotels.length === 0) {
        this.logger.log('No expired subscriptions found today.');
        return;
      }

      this.logger.log(`Found ${expiredHotels.length} expired hotels. Demoting to LITE plan.`);

      // Get LITE plan limits (or use sensible defaults)
      let liteLimits = {
        maxRooms: 2,
        maxRoomTypes: 1,
        maxStaff: 1,
        hasPromotions: false,
        hasOnlinePayment: false,
        hasSeo: false,
        hasCustomDomain: false,
        hasAdvancedAnalytics: false,
      };

      try {
        const litePlan = await this.prisma.subscriptionPlan.findFirst({
          where: {
            OR: [
              { name: 'Lite' },
              { name: 'LITE' },
              { price: 0 },
            ]
          }
        });
        if (litePlan) {
          liteLimits = {
            maxRooms: litePlan.maxRooms,
            maxRoomTypes: litePlan.maxRoomTypes,
            maxStaff: litePlan.maxStaff,
            hasPromotions: litePlan.hasPromotions,
            hasOnlinePayment: litePlan.hasOnlinePayment,
            hasSeo: litePlan.hasSeo,
            hasCustomDomain: litePlan.hasCustomDomain,
            hasAdvancedAnalytics: litePlan.hasAdvancedAnalytics,
          };
        }
      } catch (e) {
        this.logger.warn('Could not fetch Lite plan from DB, using defaults');
      }

      // Process each expired hotel individually to properly reset limits
      for (const hotel of expiredHotels) {
        try {
          await this.prisma.hotel.update({
            where: { id: hotel.id },
            data: {
              package: 'LITE',
              subscriptionStatus: 'expired',
              stripeSubscriptionId: null,
              billingCycle: 'one_time',
              ...liteLimits,
            }
          });

          this.logger.log(`Demoted hotel "${hotel.name}" (${hotel.id}) from ${hotel.package} to LITE plan with reset limits.`);
        } catch (err) {
          this.logger.error(`Failed to demote hotel ${hotel.id}: ${err.message}`);
        }
      }

      this.logger.log(`Successfully processed ${expiredHotels.length} expired subscriptions.`);
      
    } catch (error) {
      this.logger.error('Failed to process subscription expirations', error);
    }
  }
}
