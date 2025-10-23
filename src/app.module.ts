import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HotelsModule } from './modules/hotels/hotels.module';
import { RoomTypesModule } from './modules/room-types/room-types.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { RatesModule } from './modules/rates/rates.module';
import { SearchModule } from './modules/search/search.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    HotelsModule,
    RoomTypesModule,
    AvailabilityModule,
    RatesModule,
    SearchModule,
    PricingModule,
    BookingsModule,
    PaymentsModule,
    PromotionsModule,
    ReviewsModule,
    ReportsModule,
    NotificationsModule
  ],
})
export class AppModule {}
