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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const stripe_1 = __importDefault(require("stripe"));
const settings_service_1 = require("../settings/settings.service");
const notifications_service_1 = require("../notifications/notifications.service");
let PaymentsService = class PaymentsService {
    constructor(prisma, settingsService, notificationsService) {
        this.prisma = prisma;
        this.settingsService = settingsService;
        this.notificationsService = notificationsService;
    }
    async findAll(search, status) {
        const payments = await this.prisma.payment.findMany({
            where: {
                status: status && status !== 'manual' ? status : undefined,
                booking: search ? { leadName: { contains: search, mode: 'insensitive' } } : undefined
            },
            include: { booking: true },
        });
        let manualPayments = [];
        if (!status || status === 'manual' || status === 'captured') {
            manualPayments = await this.prisma.folioCharge.findMany({
                where: {
                    type: 'PAYMENT',
                    booking: search ? { leadName: { contains: search, mode: 'insensitive' } } : undefined
                },
                include: { booking: true }
            });
        }
        const normalizedOnline = payments.map(p => ({
            id: p.id,
            bookingId: p.bookingId,
            amount: (p.status === 'created' || p.status === 'pending') ? p.amount / 100 : p.amount,
            provider: p.provider,
            method: p.method || p.provider,
            status: p.status === 'created' ? 'pending' : p.status,
            date: p.createdAt,
            reference: p.chargeId || p.intentId,
            booking: p.booking,
            isManual: false
        }));
        const normalizedManual = manualPayments.map(p => ({
            id: p.id,
            bookingId: p.bookingId,
            amount: Math.abs(p.amount),
            provider: 'manual',
            method: p.description.includes('CASH') ? 'Cash' : 'Bank Transfer',
            status: 'captured',
            date: p.createdAt,
            reference: p.description,
            booking: p.booking,
            isManual: true
        }));
        const all = [...normalizedOnline, ...normalizedManual];
        return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    async createPaymentIntent(amount, currency = 'thb', description, bookingId) {
        if (bookingId) {
            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
                include: { hotel: true }
            });
            if (booking && !booking.hotel.hasOnlinePayment) {
                throw new common_1.BadRequestException('Your current plan does not support online payments. Please upgrade to PRO or use Bank Transfer/Cash.');
            }
        }
        const { secretKey } = await this.settingsService.getStripeConfig();
        const stripe = new stripe_1.default(secretKey, { apiVersion: '2024-06-20' });
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency,
            description,
            metadata: { bookingId },
            automatic_payment_methods: {
                enabled: true,
            },
        });
        if (bookingId) {
            const existing = await this.prisma.payment.findUnique({ where: { bookingId } });
            if (existing) {
                await this.prisma.payment.update({
                    where: { bookingId },
                    data: {
                        intentId: paymentIntent.id,
                        amount: Math.round(amount * 100),
                        status: 'created'
                    }
                });
            }
            else {
                await this.prisma.payment.create({
                    data: {
                        bookingId,
                        amount: Math.round(amount * 100),
                        currency,
                        provider: 'stripe',
                        status: 'created',
                        intentId: paymentIntent.id,
                        method: 'card'
                    }
                });
            }
        }
        return {
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id
        };
    }
    async createOmiseCharge(amount, token, description, bookingId) {
        if (bookingId) {
            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
                include: { hotel: true }
            });
            if (booking && !booking.hotel.hasOnlinePayment) {
                throw new common_1.BadRequestException('Your current plan does not support online payments. Please upgrade to PRO or use Bank Transfer/Cash.');
            }
        }
        const { publicKey, secretKey } = await this.settingsService.getOmiseConfig();
        const omise = require('omise')({
            publicKey: publicKey,
            secretKey: secretKey,
        });
        try {
            const charge = await omise.charges.create({
                amount: Math.round(amount * 100),
                currency: 'thb',
                card: token,
                description
            });
            return charge;
        }
        catch (error) {
            console.error('Omise Error:', error);
            throw new common_1.BadRequestException(`Omise Charge Failed: ${error.message}`);
        }
    }
    async createOmisePromptPaySource(amount, bookingId, description) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { hotel: true }
        });
        if (!booking)
            throw new common_1.BadRequestException('Booking not found');
        if (!booking.hotel.hasOnlinePayment) {
            throw new common_1.BadRequestException('Your current plan does not support online payments. Please upgrade to PRO or use Bank Transfer/Cash.');
        }
        const { publicKey, secretKey } = await this.settingsService.getOmiseConfig();
        const omise = require('omise')({ publicKey, secretKey });
        try {
            const source = await omise.sources.create({
                amount: Math.round(amount * 100),
                currency: 'thb',
                type: 'promptpay'
            });
            const charge = await omise.charges.create({
                amount: Math.round(amount * 100),
                currency: 'thb',
                source: source.id,
                description: description || `Booking ID: ${bookingId}`,
                metadata: { bookingId }
            });
            await this.prisma.payment.upsert({
                where: { bookingId },
                update: {
                    status: 'created',
                    intentId: charge.id,
                    amount: amount,
                    provider: 'omise',
                    method: 'promptpay',
                    chargeId: charge.id
                },
                create: {
                    bookingId: bookingId,
                    amount: amount,
                    currency: 'thb',
                    provider: 'omise',
                    status: 'created',
                    intentId: charge.id,
                    chargeId: charge.id,
                    method: 'promptpay'
                }
            });
            return {
                chargeId: charge.id,
                qrCodeUrl: charge.source?.scannable_code?.image?.download_uri,
                amount: amount,
                sourceId: source.id
            };
        }
        catch (error) {
            console.error('Omise PromptPay Error:', error);
            throw new common_1.BadRequestException(`PromptPay Generation Failed: ${error.message}`);
        }
    }
    async handleOmiseWebhook(payload) {
        if (!payload || payload.object !== 'event') {
            return { received: true };
        }
        const eventData = payload.data;
        const type = payload.key;
        if (type === 'charge.complete' && eventData.status === 'successful') {
            const metadata = eventData.metadata;
            if (metadata && metadata.bookingId) {
                const bookingId = metadata.bookingId;
                console.log(`✅ Omise Webhook: Payment Success for Booking ${bookingId}`);
                const updateResult = await this.prisma.booking.updateMany({
                    where: { id: bookingId, status: { not: 'confirmed' } },
                    data: { status: 'confirmed' }
                });
                if (updateResult.count === 0) {
                    console.log(`Booking ${bookingId} already confirmed or not found.`);
                }
                else {
                    const updatedBooking = await this.prisma.booking.findUnique({
                        where: { id: bookingId },
                        include: { hotel: true, roomType: true, guests: true, payment: true }
                    });
                    if (updatedBooking) {
                        try {
                            await this.notificationsService.sendPaymentSuccessEmail(updatedBooking);
                        }
                        catch (emailErr) {
                            console.error('Failed to send payment success email via Omise Webhook', emailErr);
                        }
                    }
                }
                await this.prisma.payment.upsert({
                    where: { bookingId },
                    update: {
                        status: 'captured',
                        chargeId: eventData.id
                    },
                    create: {
                        amount: eventData.amount / 100,
                        currency: eventData.currency,
                        provider: 'omise',
                        status: 'captured',
                        chargeId: eventData.id,
                        bookingId: bookingId,
                        method: eventData.source?.type || 'omise'
                    }
                });
            }
        }
        return { received: true };
    }
    async updateStatus(id, status) {
        return this.prisma.payment.update({
            where: { id },
            data: { status }
        });
    }
    async createUpgradeIntent(hotelId) {
        const { secretKey } = await this.settingsService.getStripeConfig();
        const stripe = new stripe_1.default(secretKey, { apiVersion: '2024-06-20' });
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 99000,
            currency: 'thb',
            description: 'Upgrade to PRO Plan (1 Month)',
            metadata: {
                type: 'upgrade',
                hotelId
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });
        return {
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id
        };
    }
    async handleWebhook(signature, payload) {
        const { secretKey } = await this.settingsService.getStripeConfig();
        const stripe = new stripe_1.default(secretKey, { apiVersion: '2024-06-20' });
        let event;
        try {
            event = JSON.parse(payload.toString());
        }
        catch (err) {
            throw new common_1.BadRequestException(`Webhook Error: ${err.message}`);
        }
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            const metadata = paymentIntent.metadata;
            console.log(`💰 Payment Succeeded: ${paymentIntent.id}`, metadata);
            if (metadata.bookingId) {
                const bookingId = metadata.bookingId;
                const updateResult = await this.prisma.booking.updateMany({
                    where: { id: bookingId, status: { not: 'confirmed' } },
                    data: { status: 'confirmed' }
                });
                if (updateResult.count === 0) {
                    console.log(`Booking ${bookingId} already confirmed. Skipping duplicate Webhook for Intent ${paymentIntent.id}`);
                    return { received: true };
                }
                const updatedBooking = await this.prisma.booking.findUnique({
                    where: { id: bookingId },
                    include: { hotel: true, roomType: true, guests: true, payment: true }
                });
                await this.prisma.payment.upsert({
                    where: { bookingId },
                    update: {
                        status: 'captured',
                        intentId: paymentIntent.id
                    },
                    create: {
                        amount: paymentIntent.amount / 100,
                        currency: paymentIntent.currency,
                        provider: 'stripe',
                        status: 'captured',
                        intentId: paymentIntent.id,
                        bookingId: bookingId,
                        method: 'card'
                    }
                });
                if (updatedBooking) {
                    try {
                        await this.notificationsService.sendPaymentSuccessEmail(updatedBooking);
                    }
                    catch (emailErr) {
                        console.error('Failed to send payment success email', emailErr);
                    }
                }
            }
            if (metadata.type === 'upgrade' && metadata.hotelId) {
                const hotelId = metadata.hotelId;
                const daysToAdd = 30;
                const newExpiry = new Date();
                newExpiry.setDate(newExpiry.getDate() + daysToAdd);
                await this.prisma.hotel.update({
                    where: { id: hotelId },
                    data: {
                        package: 'PRO',
                        subscriptionEnd: newExpiry
                    }
                });
                console.log(`🚀 Hotel ${hotelId} upgraded to PRO until ${newExpiry.toISOString()}`);
            }
        }
        return { received: true };
    }
    async createManualPayment(bookingId, amount, method, reference) {
        if (amount <= 0)
            throw new common_1.BadRequestException('Amount must be positive');
        const payment = await this.prisma.folioCharge.create({
            data: {
                bookingId,
                amount: -amount,
                description: `Payment via ${method}${reference ? ` (Ref: ${reference})` : ''}`,
                type: 'PAYMENT'
            }
        });
        await this.prisma.booking.update({
            where: { id: bookingId, status: 'pending' },
            data: { status: 'confirmed' }
        }).catch(() => { });
        return payment;
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        settings_service_1.SettingsService,
        notifications_service_1.NotificationsService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map