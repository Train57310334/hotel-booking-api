import Stripe from 'stripe';
export declare class StripeService {
    private stripe;
    constructor();
    createCheckoutSession(params: {
        hotelId: string;
        planId: string;
        amountInSatang: number;
        currency: string;
        successUrl: string;
        cancelUrl: string;
        customerEmail?: string;
    }): Promise<{
        url: string;
    }>;
    constructEvent(payload: any, signature: string): Stripe.Event;
}
//# sourceMappingURL=stripe.service.d.ts.map