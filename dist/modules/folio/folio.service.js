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
exports.FolioService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let FolioService = class FolioService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getFolio(bookingId) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                payment: true,
                folioCharges: true,
                roomType: true
            }
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        const totalRoom = booking.totalAmount || 0;
        const charges = booking.folioCharges.filter(c => c.amount >= 0);
        const credits = booking.folioCharges.filter(c => c.amount < 0);
        const totalCharges = charges.reduce((sum, c) => sum + c.amount, 0);
        const stripePayment = (booking.payment?.status === 'captured') ? booking.payment.amount : 0;
        const manualPayments = credits.reduce((sum, c) => sum + Math.abs(c.amount), 0);
        const totalPaid = stripePayment + manualPayments;
        const balance = (totalRoom + totalCharges) - totalPaid;
        const transactions = [
            ...(booking.payment ? [booking.payment] : []),
            ...credits.map(c => ({
                id: c.id,
                date: c.date,
                amount: Math.abs(c.amount),
                method: c.description.includes('Cash') ? 'cash' : 'transfer',
                status: 'captured',
                isManual: true,
                description: c.description
            }))
        ].sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
        return {
            bookingId,
            currency: 'THB',
            roomTotal: totalRoom,
            totalCharges,
            totalPaid,
            balance,
            charges,
            transactions
        };
    }
    async addCharge(bookingId, data) {
        return this.prisma.folioCharge.create({
            data: {
                bookingId,
                amount: data.amount,
                description: data.description,
                type: data.type || 'OTHER'
            }
        });
    }
    async removeCharge(chargeId) {
        return this.prisma.folioCharge.delete({
            where: { id: chargeId }
        });
    }
};
exports.FolioService = FolioService;
exports.FolioService = FolioService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FolioService);
//# sourceMappingURL=folio.service.js.map