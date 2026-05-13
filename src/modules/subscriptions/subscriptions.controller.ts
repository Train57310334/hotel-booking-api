import { Body, Controller, Post, Get, UseGuards, Req, ForbiddenException, Headers, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { StripeService } from './stripe.service';
import { PlansService } from './plans.service';
import { RawBodyRequest } from '@nestjs/common';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
    constructor(
        private readonly subscriptionsService: SubscriptionsService,
        private readonly stripeService: StripeService,
        private readonly plansService: PlansService
    ) {}

    @Post('checkout-session')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('owner', 'hotel_admin')
    @ApiOperation({ summary: 'Create a Stripe Checkout Session for subscription upgrade' })
    async createCheckoutSession(
        @Req() req,
        @Body() body: { hotelId: string; planId: string }
    ) {
        const userHotelId = req.user.hotelId;
        const isAdmin = req.user.roles?.includes('platform_admin');

        if (!isAdmin && userHotelId !== body.hotelId) {
            throw new ForbiddenException('You do not have permission to upgrade this hotel');
        }

        // Fetch plan to get the price
        const plans = await this.plansService.findAll();
        const plan = plans.find(p => p.id === body.planId);
        if (!plan) {
             throw new Error('Invalid plan ID');
        }

        const amountInSatang = Math.round(plan.price * 100);

        // App URL from ENV or fallback
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

    @Post('webhook')
    @ApiOperation({ summary: 'Stripe Webhook Endpoint' })
    async stripeWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Headers('stripe-signature') signature: string,
    ) {
        try {
            // req.rawBody is populated by express.raw() middleware in main.ts
            // It must be the raw bytes, not the parsed JSON object.
            const rawPayload = req.rawBody;

            if (!rawPayload) {
                throw new BadRequestException('Missing raw body — ensure express.raw() middleware is applied to this route.');
            }

            if (!signature) {
                throw new BadRequestException('Missing stripe-signature header.');
            }

            const event = await this.stripeService.constructEvent(rawPayload, signature);

            if (event.type === 'checkout.session.completed') {
                const session = event.data.object as any;
                const hotelId = session.metadata?.hotelId;
                const planId = session.metadata?.planId;
                const amount = session.amount_total;
                const chargeId = session.payment_intent as string;

                if (hotelId && planId) {
                    await this.subscriptionsService.handleSubscriptionPayment(hotelId, planId, amount, chargeId);
                }
            }

            return { received: true };
        } catch (err) {
            console.error('Webhook Error:', err.message);
            // Return 400 so Stripe knows the event was not processed
            throw new BadRequestException(`Webhook Error: ${err.message}`);
        }
    }

    @Get('payments')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('platform_admin')
    @ApiOperation({ summary: 'Get all subscription payments (Platform Admin Only)' })
    async getAllPayments() {
        return this.subscriptionsService.getAllPayments();
    }
}
