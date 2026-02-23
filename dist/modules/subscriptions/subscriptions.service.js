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
exports.SubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let SubscriptionsService = class SubscriptionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async upgradePackage(user, requestHotelId, newPackage) {
        const userHotelId = user.hotelId;
        const isAdmin = user.roles?.includes('platform_admin');
        if (!isAdmin && userHotelId !== requestHotelId) {
            throw new common_1.ForbiddenException('You do not have permission to upgrade this hotel');
        }
        throw new common_1.BadRequestException('Direct upgrades are no longer supported. Please use /checkout-session.');
    }
    async handleSubscriptionPayment(hotelId, planId, amount, chargeId) {
        const plan = await this.prisma.subscriptionPlan.findUnique({
            where: { id: planId }
        });
        if (!plan) {
            console.error(`Webhook Error: Plan ${planId} not found`);
            return;
        }
        const limits = {
            maxRooms: plan.maxRooms,
            maxRoomTypes: plan.maxRoomTypes,
            maxStaff: plan.maxStaff,
            hasPromotions: plan.hasPromotions,
            hasOnlinePayment: plan.hasOnlinePayment,
        };
        await this.prisma.$transaction([
            this.prisma.hotel.update({
                where: { id: hotelId },
                data: {
                    package: plan.id,
                    ...limits
                }
            }),
            this.prisma.subscriptionPayment.create({
                data: {
                    hotelId: hotelId,
                    amount: amount,
                    currency: 'THB',
                    plan: plan.id,
                    status: 'success',
                    provider: 'stripe',
                    chargeId: chargeId
                }
            })
        ]);
        console.log(`Successfully upgraded hotel ${hotelId} to ${plan.id}`);
    }
    async getAllPayments() {
        const payments = await this.prisma.subscriptionPayment.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                hotel: { select: { name: true, contactEmail: true } }
            }
        });
        const totalRevenue = payments.reduce((sum, p) => p.status === 'success' ? sum + p.amount : sum, 0);
        return {
            payments,
            summary: {
                totalRevenue,
                currency: 'THB',
                totalTransactions: payments.length
            }
        };
    }
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubscriptionsService);
//# sourceMappingURL=subscriptions.service.js.map