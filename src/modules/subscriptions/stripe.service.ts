import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
    private stripe: Stripe;

    constructor() {
        const apiKey = process.env.STRIPE_SECRET_KEY;
        if (!apiKey) {
            console.warn('STRIPE_SECRET_KEY is not defined in environment variables.');
        }
        this.stripe = new Stripe(apiKey || 'sk_test_dummy', {
            apiVersion: '2023-10-16' as any, // Use an appropriate API version
        });
    }

    async createCheckoutSession(params: {
        hotelId: string;
        planId: string;
        amountInSatang: number;
        currency: string;
        successUrl: string;
        cancelUrl: string;
        customerEmail?: string;
    }) {
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
                mode: 'payment', // Or 'subscription' if we have actual Stripe products mapped
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
        } catch (error) {
            console.error('Stripe session creation failed:', error);
            throw new InternalServerErrorException('Failed to create payment session');
        }
    }

    constructEvent(payload: any, signature: string): Stripe.Event {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) {
            throw new InternalServerErrorException('Stripe webhook secret is not configured.');
        }
        return this.stripe.webhooks.constructEvent(payload, signature, secret);
    }
}
