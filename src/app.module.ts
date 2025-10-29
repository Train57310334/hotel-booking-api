import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';

import { AuthModule } from '@/modules/auth/auth.module';
import { RolesModule } from '@/modules/roles/roles.module';
import { UsersModule } from '@/modules/users/users.module';
import { HotelsModule } from '@/modules/hotels/hotels.module';
import { RoomTypesModule } from '@/modules/room-types/room-types.module';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { BookingsModule } from '@/modules/bookings/bookings.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { PaymentsModule } from '@/modules/payments/payments.module';
import { PricingModule } from '@/modules/pricing/pricing.module';
import { PromotionsModule } from '@/modules/promotions/promotions.module';
import { ReviewsModule } from '@/modules/reviews/reviews.module';
import { ReportsModule } from '@/modules/reports/reports.module';
import { SearchModule } from '@/modules/search/search.module';
import { AvailabilityModule } from '@/modules/availability/availability.module';
import { RatesModule } from '@/modules/rates/rates.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    RolesModule,
    UsersModule,
    HotelsModule,
    RoomTypesModule,
    InventoryModule,
    BookingsModule,
    NotificationsModule,
    PaymentsModule,
    PricingModule,
    PromotionsModule,
    ReviewsModule,
    ReportsModule,
    SearchModule,
    AvailabilityModule,
    RatesModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
