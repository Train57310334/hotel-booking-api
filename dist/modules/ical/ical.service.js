"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var IcalService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IcalService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const schedule_1 = require("@nestjs/schedule");
const ical_generator_1 = __importDefault(require("ical-generator"));
const node_ical_1 = __importDefault(require("node-ical"));
let IcalService = IcalService_1 = class IcalService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(IcalService_1.name);
    }
    async generateIcal(hotelId) {
        const hotel = await this.prisma.hotel.findUnique({
            where: { id: hotelId },
        });
        if (!hotel) {
            throw new Error(`Hotel with ID ${hotelId} not found`);
        }
        const calendar = (0, ical_generator_1.default)({ name: `${hotel.name} Bookings` });
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
                if (!url)
                    continue;
                try {
                    const events = await node_ical_1.default.async.fromURL(url);
                    for (const eventId in events) {
                        const event = events[eventId];
                        if (event.type === 'VEVENT') {
                            const start = event.start;
                            const end = event.end;
                            if (!event.uid)
                                continue;
                            const uid = (typeof event.uid === 'object' && event.uid !== null) ? event.uid.val : event.uid;
                            const summary = typeof event.summary === 'object' ? event.summary.val : event.summary;
                            if (!start || !end)
                                continue;
                            if (end < new Date())
                                continue;
                            const externalRef = `OTA-SYNC-${uid}`;
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
                                        ratePlanId: roomType.ratePlans?.[0]?.id || 'unknown',
                                        status: 'confirmed',
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
                }
                catch (fetchErr) {
                    this.logger.error(`Failed to sync URL ${url} for RoomType ${roomType.name}: ${fetchErr.message}`);
                }
            }
            this.logger.log(`iCal Sync Completed. Synced ${syncedCount} new external bookings.`);
        }
        catch (e) {
            this.logger.error(`Fatal error in syncExternalIcal: ${e.message}`);
        }
    }
};
exports.IcalService = IcalService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_30_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], IcalService.prototype, "syncExternalIcal", null);
exports.IcalService = IcalService = IcalService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IcalService);
//# sourceMappingURL=ical.service.js.map