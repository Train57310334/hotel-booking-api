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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const subscriptions_service_1 = require("./subscriptions.service");
const stripe_service_1 = require("./stripe.service");
const plans_service_1 = require("./plans.service");
let SubscriptionsController = class SubscriptionsController {
    constructor(subscriptionsService, stripeService, plansService) {
        this.subscriptionsService = subscriptionsService;
        this.stripeService = stripeService;
        this.plansService = plansService;
    }
    async createCheckoutSession(req, body) {
        const userHotelId = req.user.hotelId;
        const isAdmin = req.user.roles?.includes('platform_admin');
        if (!isAdmin && userHotelId !== body.hotelId) {
            throw new common_1.ForbiddenException('You do not have permission to upgrade this hotel');
        }
        const plans = await this.plansService.findAll();
        const plan = plans.find(p => p.id === body.planId);
        if (!plan) {
            throw new Error('Invalid plan ID');
        }
        const amountInSatang = Math.round(plan.price * 100);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const session = await this.stripeService.createCheckoutSession({
            hotelId: body.hotelId,
            planId: body.planId,
            amountInSatang,
            currency: 'thb',
            successUrl: `${appUrl}/admin/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${appUrl}/admin/subscription?canceled=true`,
            customerEmail: req.user.email,
        });
        return { url: session.url };
    }
    async stripeWebhook(req, body) {
        try {
            const signature = req.headers['stripe-signature'];
            const event = this.stripeService.constructEvent(req.rawBody, signature);
            if (event.type === 'checkout.session.completed') {
                const session = event.data.object;
                const hotelId = session.metadata?.hotelId;
                const planId = session.metadata?.planId;
                const amount = session.amount_total;
                const chargeId = session.payment_intent;
                if (hotelId && planId) {
                    await this.subscriptionsService.handleSubscriptionPayment(hotelId, planId, amount, chargeId);
                }
            }
            return { received: true };
        }
        catch (err) {
            console.error('Webhook Error:', err.message);
            throw new Error(`Webhook Error: ${err.message}`);
        }
    }
    async getAllPayments() {
        return this.subscriptionsService.getAllPayments();
    }
};
exports.SubscriptionsController = SubscriptionsController;
__decorate([
    (0, common_1.Post)('checkout-session'),
    (0, roles_decorator_1.Roles)('owner', 'hotel_admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a Stripe Checkout Session for subscription upgrade' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "createCheckoutSession", null);
__decorate([
    (0, common_1.Post)('webhook'),
    (0, swagger_1.ApiOperation)({ summary: 'Stripe Webhook Endpoint' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "stripeWebhook", null);
__decorate([
    (0, common_1.Get)('payments'),
    (0, roles_decorator_1.Roles)('platform_admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all subscription payments (Platform Admin Only)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getAllPayments", null);
exports.SubscriptionsController = SubscriptionsController = __decorate([
    (0, swagger_1.ApiTags)('subscriptions'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('subscriptions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [subscriptions_service_1.SubscriptionsService,
        stripe_service_1.StripeService,
        plans_service_1.PlansService])
], SubscriptionsController);
//# sourceMappingURL=subscriptions.controller.js.map