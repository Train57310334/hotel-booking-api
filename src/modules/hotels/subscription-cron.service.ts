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
          package: { in: ['PRO', 'ENTERPRISE'] },
          subscriptionEnd: { lt: now }
        }
      });

      if (expiredHotels.length === 0) {
        this.logger.log('No expired subscriptions found today.');
        return;
      }

      this.logger.log(`Found ${expiredHotels.length} expired hotels. Demoting to LITE plan.`);

      // Demote them sequentially or via updateMany
      // We use updateMany for atomicity and speed
      const result = await this.prisma.hotel.updateMany({
        where: {
          package: { in: ['PRO', 'ENTERPRISE'] },
          subscriptionEnd: { lt: now }
        },
        data: {
          package: 'LITE'
        }
      });

      this.logger.log(`Successfully demoted ${result.count} hotels to LITE plan.`);
      
    } catch (error) {
      this.logger.error('Failed to process subscription expirations', error);
    }
  }
}
