"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("./common/prisma/prisma.service");
const prisma_module_1 = require("./common/prisma/prisma.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const hotels_module_1 = require("./modules/hotels/hotels.module");
const room_types_module_1 = require("./modules/room-types/room-types.module");
const inventory_module_1 = require("./modules/inventory/inventory.module");
const bookings_module_1 = require("./modules/bookings/bookings.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const payments_module_1 = require("./modules/payments/payments.module");
const pricing_module_1 = require("./modules/pricing/pricing.module");
const promotions_module_1 = require("./modules/promotions/promotions.module");
const reviews_module_1 = require("./modules/reviews/reviews.module");
const reports_module_1 = require("./modules/reports/reports.module");
const search_module_1 = require("./modules/search/search.module");
const availability_module_1 = require("./modules/availability/availability.module");
const rates_module_1 = require("./modules/rates/rates.module");
const owners_module_1 = require("./modules/owners/owners.module");
const rooms_module_1 = require("./modules/rooms/rooms.module");
const upload_module_1 = require("./modules/upload/upload.module");
const messages_module_1 = require("./modules/messages/messages.module");
const settings_module_1 = require("./modules/settings/settings.module");
const expenses_module_1 = require("./modules/expenses/expenses.module");
const guests_module_1 = require("./modules/guests/guests.module");
const staff_module_1 = require("./modules/staff/staff.module");
const night_audit_module_1 = require("./modules/night-audit/night-audit.module");
const folio_module_1 = require("./modules/folio/folio.module");
const downloads_module_1 = require("./modules/downloads/downloads.module");
const subscriptions_module_1 = require("./modules/subscriptions/subscriptions.module");
const ical_module_1 = require("./modules/ical/ical.module");
const housekeeping_module_1 = require("./modules/housekeeping/housekeeping.module");
const channels_module_1 = require("./modules/channels/channels.module");
const events_module_1 = require("./modules/events/events.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            hotels_module_1.HotelsModule,
            room_types_module_1.RoomTypesModule,
            rooms_module_1.RoomsModule,
            bookings_module_1.BookingsModule,
            upload_module_1.UploadModule,
            messages_module_1.MessagesModule,
            settings_module_1.SettingsModule,
            inventory_module_1.InventoryModule,
            notifications_module_1.NotificationsModule,
            payments_module_1.PaymentsModule,
            pricing_module_1.PricingModule,
            promotions_module_1.PromotionsModule,
            reviews_module_1.ReviewsModule,
            reports_module_1.ReportsModule,
            search_module_1.SearchModule,
            availability_module_1.AvailabilityModule,
            rates_module_1.RatesModule,
            owners_module_1.OwnersModule,
            expenses_module_1.ExpensesModule,
            guests_module_1.GuestsModule,
            staff_module_1.StaffModule,
            night_audit_module_1.NightAuditModule,
            folio_module_1.FolioModule,
            downloads_module_1.DownloadsModule,
            subscriptions_module_1.SubscriptionsModule,
            ical_module_1.IcalModule,
            housekeeping_module_1.HousekeepingModule,
            channels_module_1.ChannelsModule,
            events_module_1.EventsModule,
        ],
        providers: [prisma_service_1.PrismaService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map