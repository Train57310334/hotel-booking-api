import { SubscriptionsService } from './subscriptions.service';
import { StripeService } from './stripe.service';
import { PlansService } from './plans.service';
import { RawBodyRequest } from '@nestjs/common';
export declare class SubscriptionsController {
    private readonly subscriptionsService;
    private readonly stripeService;
    private readonly plansService;
    constructor(subscriptionsService: SubscriptionsService, stripeService: StripeService, plansService: PlansService);
    createCheckoutSession(req: any, body: {
        hotelId: string;
        planId: string;
    }): Promise<{
        url: string;
    }>;
    stripeWebhook(req: RawBodyRequest<Request>, body: any): Promise<{
        received: boolean;
    }>;
    getAllPayments(): Promise<{
        payments: ({
            hotel: {
                name: string;
                contactEmail: string;
            };
        } & {
            id: string;
            createdAt: Date;
            hotelId: string;
            status: string;
            currency: string;
            provider: string;
            chargeId: string | null;
            amount: number;
            plan: string;
        })[];
        summary: {
            totalRevenue: number;
            currency: string;
            totalTransactions: number;
        };
    }>;
}
//# sourceMappingURL=subscriptions.controller.d.ts.map