import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { InventoryModule } from '@/modules/inventory/inventory.module';

import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [NotificationsModule, InventoryModule, JwtModule],
  controllers: [BookingsController],
  providers: [BookingsService, PrismaService],
  exports: [BookingsService],
})
export class BookingsModule {}
