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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const inventory_service_1 = require("../inventory/inventory.service");
let BookingsService = class BookingsService {
    constructor(prisma, notificationsService, inventoryService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
        this.inventoryService = inventoryService;
    }
    async saveDraft(data) {
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        const draft = await this.prisma.bookingDraft.create({
            data: {
                data,
                expiresAt
            }
        });
        return { draftId: draft.id, expiresAt };
    }
    async getDraft(draftId) {
        const draft = await this.prisma.bookingDraft.findUnique({ where: { id: draftId } });
        if (!draft)
            return null;
        if (new Date() > draft.expiresAt) {
            await this.prisma.bookingDraft.delete({ where: { id: draftId } });
            return null;
        }
        return draft.data;
    }
    async cleanExpiredDrafts() {
        await this.prisma.bookingDraft.deleteMany({
            where: {
                expiresAt: { lt: new Date() }
            }
        });
    }
    async create(data) {
        const available = await this.inventoryService.checkAvailability(data.roomTypeId, data.checkIn, data.checkOut);
        if (!available)
            throw new common_1.NotFoundException('No rooms available for selected dates');
        const checkInDate = new Date(data.checkIn);
        const checkOutDate = new Date(data.checkOut);
        if (data.roomId) {
            const roomConflict = await this.prisma.booking.findFirst({
                where: {
                    roomId: data.roomId,
                    status: { not: 'cancelled' },
                    checkIn: { lt: checkOutDate },
                    checkOut: { gt: checkInDate }
                }
            });
            if (roomConflict) {
                throw new common_1.ConflictException(`Selected Room is already booked for these dates.`);
            }
        }
        if (!data.roomId) {
            const conflictingBookings = await this.prisma.booking.findMany({
                where: {
                    roomTypeId: data.roomTypeId,
                    roomId: { not: null },
                    status: { not: 'cancelled' },
                    checkIn: { lt: checkOutDate },
                    checkOut: { gt: checkInDate }
                },
                select: { roomId: true }
            });
            const conflictingRoomIds = conflictingBookings.map(b => b.roomId).filter((id) => id !== null);
            const availableRoom = await this.prisma.room.findFirst({
                where: {
                    roomTypeId: data.roomTypeId,
                    deletedAt: null,
                    ...(conflictingRoomIds.length > 0 ? { id: { notIn: conflictingRoomIds } } : {})
                }
            });
            if (!availableRoom) {
                throw new common_1.NotFoundException('No specific room available for assignment (unexpected inventory mismatch)');
            }
            data.roomId = availableRoom.id;
        }
        const validatedPrice = await this.calculateTotalPrice(data.roomTypeId, data.ratePlanId, checkInDate, checkOutDate, data.promotionCode);
        if (data.totalAmount && Math.abs(data.totalAmount - validatedPrice) > 50) {
            throw new common_1.BadRequestException(`Price validation failed: Server calculated ${validatedPrice}, but received ${data.totalAmount}`);
        }
        data.totalAmount = validatedPrice;
        const booking = await this.prisma.$transaction(async (tx) => {
            const bookingData = {
                userId: data.userId ?? null,
                hotelId: data.hotelId,
                roomTypeId: data.roomTypeId,
                ratePlanId: data.ratePlanId,
                roomId: data.roomId,
                checkIn: checkInDate,
                checkOut: checkOutDate,
                guestsAdult: data.guests?.adult ?? 2,
                guestsChild: data.guests?.child ?? 0,
                totalAmount: data.totalAmount ?? 0,
                status: 'pending',
                leadName: data.leadGuest?.name ?? 'Guest',
                leadEmail: data.leadGuest?.email ?? 'guest@example.com',
                leadPhone: data.leadGuest?.phone ?? '',
                specialRequests: data.specialRequests ?? null,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const newBooking = await tx.booking.create({
                data: bookingData,
                include: { hotel: true, roomType: true },
            });
            if (data.paymentMethod) {
                await tx.payment.create({
                    data: {
                        bookingId: newBooking.id,
                        amount: data.totalAmount ?? 0,
                        provider: data.paymentMethod,
                        status: data.paymentStatus ?? 'pending',
                        currency: 'THB'
                    }
                });
            }
            const dateRange = [];
            let d = new Date(checkInDate);
            while (d < checkOutDate) {
                dateRange.push(new Date(d));
                d.setDate(d.getDate() + 1);
            }
            await this.inventoryService.reduceInventory(data.roomTypeId, dateRange, tx);
            return newBooking;
        });
        await this.notificationsService.sendBookingConfirmationEmail(booking);
        return booking;
    }
    async createPublicBooking(data) {
        const checkInDate = new Date(data.checkInDate);
        const checkOutDate = new Date(data.checkOutDate);
        if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
            throw new common_1.BadRequestException('Invalid check-in or check-out date');
        }
        if (!data.rooms || !Array.isArray(data.rooms) || data.rooms.length === 0) {
            throw new common_1.BadRequestException('At least one room must be selected');
        }
        return await this.prisma.$transaction(async (tx) => {
            let backendCalculatedTotal = 0;
            for (const roomOpt of data.rooms) {
                const dateRange = [];
                let d = new Date(checkInDate);
                while (d < checkOutDate) {
                    dateRange.push(new Date(d));
                    d.setDate(d.getDate() + 1);
                }
                const totalRooms = await tx.room.count({ where: { roomTypeId: roomOpt.roomTypeId, deletedAt: null } });
                for (const date of dateRange) {
                    const inv = await tx.inventoryCalendar.findFirst({
                        where: { roomTypeId: roomOpt.roomTypeId, date }
                    });
                    const available = inv ? inv.allotment : totalRooms;
                    if (available < roomOpt.quantity) {
                        throw new common_1.ConflictException(`Insufficient inventory for Room Type ${roomOpt.roomTypeId} on ${date.toISOString().split('T')[0]}`);
                    }
                }
                const roomType = await tx.roomType.findUnique({ where: { id: roomOpt.roomTypeId } });
                if (!roomType)
                    throw new common_1.NotFoundException('RoomType provided not found');
                const ratePlan = await tx.ratePlan.findUnique({ where: { id: roomOpt.ratePlanId } });
                if (!ratePlan)
                    throw new common_1.NotFoundException('RatePlan provided not found');
                let roomTotal = 0;
                let cur = new Date(checkInDate);
                const overrides = await tx.rateOverride.findMany({
                    where: { roomTypeId: roomOpt.roomTypeId, ratePlanId: roomOpt.ratePlanId, date: { gte: checkInDate, lt: checkOutDate } }
                });
                const overrideMap = new Map();
                overrides.forEach(o => overrideMap.set(o.date.toISOString().split('T')[0], o.baseRate));
                while (cur < checkOutDate) {
                    const dateKey = cur.toISOString().split('T')[0];
                    if (overrideMap.has(dateKey)) {
                        roomTotal += overrideMap.get(dateKey);
                    }
                    else {
                        let nightly = roomType.basePrice || 0;
                        if (ratePlan.includesBreakfast && ratePlan.breakfastPrice > 0) {
                            nightly += ratePlan.breakfastPrice;
                        }
                        roomTotal += nightly;
                    }
                    cur.setDate(cur.getDate() + 1);
                }
                roomTotal *= roomOpt.quantity;
                backendCalculatedTotal += roomTotal;
            }
            if (Math.abs((data.totalPrice || 0) - backendCalculatedTotal) > 50) {
                throw new common_1.BadRequestException(`Price manipulation detected. Expected ~${backendCalculatedTotal}, got ${data.totalPrice}`);
            }
            const primaryRoom = data.rooms[0];
            const newBooking = await tx.booking.create({
                data: {
                    hotelId: data.hotelId,
                    roomTypeId: primaryRoom.roomTypeId,
                    ratePlanId: primaryRoom.ratePlanId,
                    checkIn: checkInDate,
                    checkOut: checkOutDate,
                    guestsAdult: data.adults ?? 2,
                    guestsChild: data.children ?? 0,
                    totalAmount: backendCalculatedTotal,
                    status: 'pending',
                    leadName: data.guestDetails?.name ?? 'Guest',
                    leadEmail: data.guestDetails?.email ?? 'guest@example.com',
                    leadPhone: data.guestDetails?.phone ?? '',
                    specialRequests: data.guestDetails?.requests ?? null,
                },
                include: { hotel: true, roomType: true }
            });
            if (data.paymentMethod) {
                await tx.payment.create({
                    data: {
                        bookingId: newBooking.id,
                        amount: backendCalculatedTotal,
                        provider: data.paymentMethod,
                        status: data.paymentStatus ?? 'pending',
                        currency: 'THB',
                        method: data.paymentMethod,
                    }
                });
            }
            for (const roomOpt of data.rooms) {
                const dateRange = [];
                let d = new Date(checkInDate);
                while (d < checkOutDate) {
                    dateRange.push(new Date(d));
                    d.setDate(d.getDate() + 1);
                }
                for (const date of dateRange) {
                    const inv = await tx.inventoryCalendar.findFirst({
                        where: { roomTypeId: roomOpt.roomTypeId, date }
                    });
                    if (inv) {
                        await tx.inventoryCalendar.update({
                            where: { id: inv.id },
                            data: { allotment: { decrement: roomOpt.quantity } }
                        });
                    }
                    else {
                        const totalRooms = await tx.room.count({ where: { roomTypeId: roomOpt.roomTypeId, deletedAt: null } });
                        if (totalRooms < roomOpt.quantity) {
                            throw new common_1.ConflictException(`Insufficient physical rooms for Room Type ${roomOpt.roomTypeId}`);
                        }
                        await tx.inventoryCalendar.create({
                            data: {
                                roomTypeId: roomOpt.roomTypeId,
                                date,
                                allotment: totalRooms - roomOpt.quantity,
                                stopSale: false,
                                minStay: 1
                            }
                        });
                    }
                }
            }
            return newBooking;
        });
    }
    async getMyBookings(userId) {
        if (!userId)
            throw new common_1.NotFoundException('User ID is required');
        const now = new Date();
        const [upcoming, past] = await Promise.all([
            this.prisma.booking.findMany({
                where: { userId, checkIn: { gte: now } },
                include: { hotel: true, roomType: true, ratePlan: true, payment: true },
            }),
            this.prisma.booking.findMany({
                where: { userId, checkOut: { lt: now } },
                include: { hotel: true, roomType: true, ratePlan: true, payment: true },
            }),
        ]);
        return { upcoming, past };
    }
    async confirmPayment(bookingId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { hotel: true, roomType: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        await this.notificationsService.sendPaymentSuccessEmail(booking);
        return this.prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'confirmed' },
        });
    }
    async cancelBooking(bookingId, userId) {
        const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (userId && booking.userId !== userId)
            throw new common_1.NotFoundException('Unauthorized access');
        await this.notificationsService.sendCancellationEmail(booking);
        return this.prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'cancelled' },
        });
    }
    async cancelBookingByAdmin(bookingId, hotelId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { hotel: true }
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.hotelId !== hotelId)
            throw new common_1.ForbiddenException('Booking does not belong to this hotel');
        await this.notificationsService.sendCancellationEmail(booking);
        return this.prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'cancelled' },
        });
    }
    async requestFeedback(id) {
        const booking = await this.prisma.booking.findUnique({
            where: { id },
            include: { hotel: true, roomType: true }
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        await this.notificationsService.sendFeedbackRequest(booking);
        return { success: true, message: 'Feedback request sent' };
    }
    async find(id) {
        const booking = await this.prisma.booking.findUnique({
            where: { id },
            include: {
                hotel: true,
                roomType: true,
                ratePlan: true,
                payment: true,
                guests: true,
            },
        });
        if (!booking)
            throw new common_1.NotFoundException(`Booking with ID ${id} not found`);
        return booking;
    }
    async findAll(hotelId, search, status, sortBy = 'createdAt', order = 'desc', page = 1, limit = 20) {
        const where = { hotelId };
        if (status && status !== 'All') {
            where.status = status.toLowerCase();
        }
        if (search) {
            where.OR = [
                { leadName: { contains: search, mode: 'insensitive' } },
                { leadEmail: { contains: search, mode: 'insensitive' } },
                { id: { contains: search, mode: 'insensitive' } }
            ];
        }
        const orderBy = {};
        if (['createdAt', 'checkIn', 'checkOut', 'totalAmount', 'status'].includes(sortBy)) {
            orderBy[sortBy] = order === 'asc' ? 'asc' : 'desc';
        }
        else {
            orderBy.createdAt = 'desc';
        }
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.max(1, Number(limit) || 20);
        const [data, total] = await Promise.all([
            this.prisma.booking.findMany({
                where,
                include: {
                    hotel: true,
                    user: true,
                    roomType: true,
                    room: true,
                    payment: true,
                    guests: true,
                },
                orderBy,
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
            }),
            this.prisma.booking.count({ where })
        ]);
        return {
            data,
            meta: {
                total,
                page: pageNum,
                last_page: Math.ceil(total / limitNum),
                limit: limitNum
            }
        };
    }
    async updateStatus(bookingId, status, hotelId, userId, roomId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { room: true }
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.hotelId !== hotelId)
            throw new common_1.ForbiddenException('Booking does not belong to this hotel');
        if (status === 'checked_in') {
            if (booking.status !== 'confirmed')
                throw new common_1.BadRequestException('Only confirmed bookings can be checked in.');
            if (!roomId && !booking.roomId)
                throw new common_1.BadRequestException('A physical room must be assigned to check in.');
            const finalRoomId = roomId || booking.roomId;
            const room = await this.prisma.room.findUnique({ where: { id: finalRoomId }, include: { roomType: true } });
            if (!room || room.roomTypeId !== booking.roomTypeId)
                throw new common_1.BadRequestException('Invalid room assignment.');
            return await this.prisma.$transaction([
                this.prisma.booking.update({
                    where: { id: bookingId },
                    data: { status, roomId: finalRoomId }
                }),
                this.prisma.room.update({
                    where: { id: finalRoomId },
                    data: { status: 'OCCUPIED' }
                }),
                this.prisma.roomStatusLog.create({
                    data: { roomId: finalRoomId, status: 'OCCUPIED', updatedBy: userId, note: `Checked in booking #${booking.id}` }
                })
            ]);
        }
        if (status === 'checked_out') {
            if (booking.status !== 'checked_in')
                throw new common_1.BadRequestException('Booking must be checked in before checking out.');
            const finalRoomId = booking.roomId;
            return await this.prisma.$transaction(async (tx) => {
                const updatedBooking = await tx.booking.update({
                    where: { id: bookingId },
                    data: { status }
                });
                if (finalRoomId) {
                    await tx.room.update({
                        where: { id: finalRoomId },
                        data: { status: 'DIRTY' }
                    });
                    await tx.roomStatusLog.create({
                        data: { roomId: finalRoomId, status: 'DIRTY', updatedBy: userId, note: `Checked out booking #${booking.id}` }
                    });
                }
                return updatedBooking;
            });
        }
        const updatedBooking = await this.prisma.booking.update({
            where: { id: bookingId },
            data: { status },
        });
        return updatedBooking;
    }
    async getCalendarBookings(hotelId, month, year) {
        if (!hotelId)
            throw new common_1.BadRequestException('Hotel ID Required');
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const bookings = await this.prisma.booking.findMany({
            where: {
                hotelId,
                checkIn: { lte: endDate },
                checkOut: { gte: startDate },
                status: { not: 'cancelled' }
            },
            select: { checkIn: true, checkOut: true }
        });
        const daysInMonth = endDate.getDate();
        const result = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const currentDate = new Date(year, month - 1, d);
            let count = 0;
            bookings.forEach(b => {
                if (currentDate >= new Date(b.checkIn) && currentDate < new Date(b.checkOut)) {
                    count++;
                }
            });
            result.push({ day: d, count });
        }
        return result;
    }
    async getCalendarEvents(hotelId, start, end) {
        if (!hotelId)
            throw new common_1.BadRequestException('Hotel ID Required');
        const startDate = new Date(start);
        const endDate = new Date(end);
        return this.prisma.booking.findMany({
            where: {
                hotelId,
                status: { not: 'cancelled' },
                checkIn: { lt: endDate },
                checkOut: { gt: startDate }
            },
            select: {
                id: true,
                checkIn: true,
                checkOut: true,
                status: true,
                leadName: true,
                leadEmail: true,
                leadPhone: true,
                guestsAdult: true,
                guestsChild: true,
                roomId: true,
                roomTypeId: true,
                totalAmount: true,
                room: { select: { id: true, roomNumber: true } },
                roomType: { select: { name: true } },
                payment: true
            }
        });
    }
    async calculateTotalPrice(roomTypeId, ratePlanId, checkIn, checkOut, promoCode) {
        const roomType = await this.prisma.roomType.findUnique({ where: { id: roomTypeId } });
        if (!roomType)
            throw new common_1.NotFoundException('RoomType provided not found');
        const ratePlan = await this.prisma.ratePlan.findUnique({ where: { id: ratePlanId } });
        if (!ratePlan)
            throw new common_1.NotFoundException('RatePlan provided not found');
        let total = 0;
        const current = new Date(checkIn);
        const overrides = await this.prisma.rateOverride.findMany({
            where: {
                roomTypeId,
                ratePlanId,
                date: { gte: checkIn, lt: checkOut }
            }
        });
        const overrideMap = new Map();
        overrides.forEach(o => overrideMap.set(o.date.toISOString().split('T')[0], o.baseRate));
        while (current < checkOut) {
            const dateKey = current.toISOString().split('T')[0];
            if (overrideMap.has(dateKey)) {
                total += overrideMap.get(dateKey);
            }
            else {
                let nightly = roomType.basePrice || 0;
                const rp = ratePlan;
                if (rp.includesBreakfast && rp.breakfastPrice > 0) {
                    nightly += rp.breakfastPrice;
                }
                total += nightly;
            }
            current.setDate(current.getDate() + 1);
        }
        if (promoCode) {
            const promo = await this.prisma.promotion.findUnique({ where: { code: promoCode } });
            const now = new Date();
            if (promo && promo.startDate <= now && promo.endDate >= now) {
                if (promo.type === 'percent') {
                    const discount = Math.floor(total * (promo.value / 100));
                    total = Math.max(0, total - discount);
                }
                else if (promo.type === 'fixed') {
                    total = Math.max(0, total - promo.value);
                }
            }
        }
        return total;
    }
    async getDashboardStatsNew(hotelId, period = 'month') {
        if (!hotelId)
            throw new common_1.BadRequestException('Hotel ID is required for dashboard stats');
        const now = new Date();
        let startDate = new Date();
        if (period === 'today')
            startDate.setHours(0, 0, 0, 0);
        else if (period === 'week')
            startDate.setDate(now.getDate() - 7);
        else if (period === 'month')
            startDate.setMonth(now.getMonth() - 1);
        else if (period === 'year')
            startDate.setFullYear(now.getFullYear() - 1);
        else
            startDate = new Date(0);
        const bookings = await this.prisma.booking.findMany({
            where: {
                hotelId,
                createdAt: { gte: startDate },
                status: { not: 'cancelled' }
            }
        });
        const totalBookings = bookings.length;
        const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
        const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        const todayStr = new Date().toISOString().split('T')[0];
        const checkIns = await this.prisma.booking.count({
            where: { hotelId, checkIn: { gte: new Date(todayStr), lt: new Date(new Date(todayStr).getTime() + 86400000) }, status: 'confirmed' }
        });
        const checkOuts = await this.prisma.booking.count({
            where: { hotelId, checkOut: { gte: new Date(todayStr), lt: new Date(new Date(todayStr).getTime() + 86400000) }, status: 'confirmed' }
        });
        const totalRooms = await this.prisma.room.count({
            where: { roomType: { hotelId } }
        });
        const activeBookings = await this.prisma.booking.count({
            where: {
                hotelId,
                checkIn: { lte: now },
                checkOut: { gt: now },
                status: { in: ['confirmed', 'checked_in'] }
            }
        });
        const safeTotalRooms = totalRooms > 0 ? totalRooms : 10;
        const occupancyRate = Math.round((activeBookings / safeTotalRooms) * 100);
        const chartMap = new Map();
        bookings.forEach(b => {
            const date = new Date(b.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            chartMap.set(date, (chartMap.get(date) || 0) + b.totalAmount);
        });
        const chartData = Array.from(chartMap, ([name, value]) => ({ name, value }));
        const occupancyChart = [];
        return {
            totalBookings,
            confirmedBookings,
            totalRevenue,
            checkInsToday: checkIns,
            checkOutsToday: checkOuts,
            totalRooms: safeTotalRooms,
            availableRooms: safeTotalRooms - activeBookings,
            occupancyRate,
            chartData,
            occupancyChart: occupancyChart.reverse()
        };
    }
    async generateInvoice(bookingId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                hotel: true,
                roomType: true,
                ratePlan: true,
                folioCharges: true,
                room: true,
            }
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        const checkInDate = new Date(booking.checkIn);
        const checkOutDate = new Date(booking.checkOut);
        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
        const baseRoomCharge = booking.totalAmount;
        const lineItems = [
            {
                description: `Accommodation: ${booking.roomType.name} (${nights} nights)`,
                amount: baseRoomCharge,
                quantity: 1
            }
        ];
        if (booking.folioCharges && booking.folioCharges.length > 0) {
            booking.folioCharges.forEach(charge => {
                lineItems.push({
                    description: charge.description,
                    amount: charge.amount,
                    quantity: 1
                });
            });
        }
        const total = lineItems.reduce((acc, item) => acc + (item.amount * item.quantity), 0);
        const taxRate = 0.07;
        const taxAmount = total * taxRate;
        const subtotal = total - taxAmount;
        return {
            invoiceId: `INV-${booking.id.toUpperCase().slice(-6)}`,
            date: new Date().toISOString(),
            hotel: {
                name: booking.hotel.name,
                address: booking.hotel.address,
                taxId: 'TX-123456789',
                email: booking.hotel.contactEmail,
                phone: booking.hotel.contactPhone
            },
            guest: {
                name: booking.leadName,
                email: booking.leadEmail,
                phone: booking.leadPhone
            },
            stay: {
                checkIn: booking.checkIn,
                checkOut: booking.checkOut,
                nights: nights,
                roomNumber: booking.room?.roomNumber || 'Unassigned',
                guests: `${booking.guestsAdult} Adult(s), ${booking.guestsChild} Child(ren)`
            },
            lineItems,
            summary: {
                subtotal: Math.round(subtotal),
                tax: Math.round(taxAmount),
                total: total
            },
            paymentStatus: booking.status === 'confirmed' || booking.status === 'checked_in' || booking.status === 'checked_out' ? 'PAID' : 'DUE'
        };
    }
    async getAllPlatformBookings(query = {}) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 50;
        const skip = (page - 1) * limit;
        const whereClause = {};
        if (query.hotelId) {
            whereClause.hotelId = query.hotelId;
        }
        if (query.status) {
            whereClause.status = query.status;
        }
        const totalItems = await this.prisma.booking.count({ where: whereClause });
        const bookings = await this.prisma.booking.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                hotel: { select: { name: true, contactEmail: true } },
                roomType: { select: { name: true } },
                user: { select: { name: true, email: true } }
            }
        });
        return {
            bookings,
            meta: {
                totalItems,
                itemCount: bookings.length,
                itemsPerPage: limit,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page
            }
        };
    }
};
exports.BookingsService = BookingsService;
__decorate([
    (0, schedule_1.Cron)('0 */5 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BookingsService.prototype, "cleanExpiredDrafts", null);
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        inventory_service_1.InventoryService])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map