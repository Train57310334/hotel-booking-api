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
exports.StripeService = void 0;
const common_1 = require("@nestjs/common");
const stripe_1 = __importDefault(require("stripe"));
let StripeService = class StripeService {
    constructor() {
        const apiKey = process.env.STRIPE_SECRET_KEY;
        if (!apiKey) {
            console.warn('STRIPE_SECRET_KEY is not defined in environment variables.');
        }
        this.stripe = new stripe_1.default(apiKey || 'sk_test_dummy', {
            apiVersion: '2023-10-16',
        });
    }
    async createCheckoutSession(params) {
        try {
            const session = await this.stripe.checkout.sessions.create({
                payment_method_types: ['card', 'promptpay'],
                line_items: [
                    {
                        price_data: {
                            currency: params.currency,
                            product_data: {
                                name: `BookingKub ${params.planId} Plan`,
                                description: 'Platform Subscription Fee',
                            },
                            unit_amount: params.amountInSatang,
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: params.successUrl,
                cancel_url: params.cancelUrl,
                client_reference_id: params.hotelId,
                customer_email: params.customerEmail,
                metadata: {
                    hotelId: params.hotelId,
                    planId: params.planId,
                }
            });
            return { url: session.url };
        }
        catch (error) {
            console.error('Stripe session creation failed:', error);
            throw new common_1.InternalServerErrorException('Failed to create payment session');
        }
    }
    constructEvent(payload, signature) {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) {
            throw new common_1.InternalServerErrorException('Stripe webhook secret is not configured.');
        }
        return this.stripe.webhooks.constructEvent(payload, signature, secret);
    }
};
exports.StripeService = StripeService;
exports.StripeService = StripeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], StripeService);
//# sourceMappingURL=stripe.service.js.map