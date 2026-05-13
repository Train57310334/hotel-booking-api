import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Stripe from 'stripe';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class StripeService {
    constructor(private settingsService: SettingsService) {}

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
            const { secretKey } = await this.settingsService.getStripeConfig();
            const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' as any });

            const session = await stripe.checkout.sessions.create({
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

    async constructEvent(payload: any, signature: string): Promise<Stripe.Event> {
        const { secretKey, webhookSecret } = await this.settingsService.getStripeConfig();
        const secret = webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) {
            throw new InternalServerErrorException('Stripe webhook secret is not configured.');
        }
        const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' as any });
        return stripe.webhooks.constructEvent(payload, signature, secret);
    }
}
