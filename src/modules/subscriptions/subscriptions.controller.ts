import { Body, Controller, Post, Get, UseGuards, Req, ForbiddenException } from '@nestjs/common';
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
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
    constructor(
        private readonly subscriptionsService: SubscriptionsService,
        private readonly stripeService: StripeService,
        private readonly plansService: PlansService
    ) {}

    @Post('checkout-session')
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
    async stripeWebhook(@Req() req: RawBodyRequest<Request>, @Body() body: any) {
        try {
            const signature = req.headers['stripe-signature'] as string;
            // The raw body is required by Stripe to verify the payload
            const event = this.stripeService.constructEvent(req.rawBody, signature);

            if (event.type === 'checkout.session.completed') {
                const session = event.data.object as any;
                const hotelId = session.metadata?.hotelId;
                const planId = session.metadata?.planId;
                const amount = session.amount_total;
                const chargeId = session.payment_intent as string; // Or session.id

                if (hotelId && planId) {
                     await this.subscriptionsService.handleSubscriptionPayment(hotelId, planId, amount, chargeId);
                }
            }

            return { received: true };
        } catch (err) {
            console.error('Webhook Error:', err.message);
            // It's important to return a 400 error if verification fails
            // return new BadRequestException(`Webhook Error: ${err.message}`);
            // But throw is handled by NestJS cleanly
            throw new Error(`Webhook Error: ${err.message}`);
        }
    }

    @Get('payments')
    @Roles('platform_admin')
    @ApiOperation({ summary: 'Get all subscription payments (Platform Admin Only)' })
    async getAllPayments() {
        return this.subscriptionsService.getAllPayments();
    }
}
