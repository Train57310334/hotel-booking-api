import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

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
import { OwnersModule } from '@/modules/owners/owners.module';
import { RoomsModule } from '@/modules/rooms/rooms.module';
import { UploadModule } from '@/modules/upload/upload.module';
import { MessagesModule } from '@/modules/messages/messages.module';
import { SettingsModule } from '@/modules/settings/settings.module';

import { ExpensesModule } from './modules/expenses/expenses.module';
import { GuestsModule } from './modules/guests/guests.module';
import { StaffModule } from './modules/staff/staff.module';

import { NightAuditModule } from './modules/night-audit/night-audit.module';
import { FolioModule } from './modules/folio/folio.module';
import { DownloadsModule } from './modules/downloads/downloads.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { IcalModule } from './modules/ical/ical.module';
import { HousekeepingModule } from './modules/housekeeping/housekeeping.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { EventsModule } from './modules/events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    HotelsModule,
    RoomTypesModule,
    RoomsModule,
    BookingsModule,
    UploadModule,
    MessagesModule,
    SettingsModule,
    InventoryModule,
    NotificationsModule,
    PaymentsModule,
    PricingModule,
    PromotionsModule,
    ReviewsModule,
    ReportsModule,
    SearchModule,
    AvailabilityModule,
    RatesModule,
    OwnersModule,
    ExpensesModule,
    GuestsModule,
    StaffModule,
    NightAuditModule,
    FolioModule,
    DownloadsModule,
    SubscriptionsModule,
    IcalModule,
    HousekeepingModule,
    ChannelsModule,
    EventsModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}