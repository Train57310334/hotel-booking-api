import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import Stripe from 'stripe';
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service'; // Import

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private notificationsService: NotificationsService // Inject
  ) {}

  async findAll(search?: string, status?: string) {
    return this.prisma.payment.findMany({
      where: {
        status: status || undefined,
        booking: search ? { leadName: { contains: search, mode: 'insensitive' } } : undefined
      },
      include: { booking: true },
      orderBy: { id: 'desc' }
    });
  }

  async createPaymentIntent(amount: number, currency = 'thb', description?: string, bookingId?: string) {
    const { secretKey } = await this.settingsService.getStripeConfig();
    const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' as any });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to subunits
      currency,
      description,
      metadata: { bookingId },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Create Payment Record as 'created' (Pending)
    if (bookingId) {
        // Check if exists to avoid unique constraint error if user retries
        const existing = await this.prisma.payment.findUnique({ where: { bookingId } });
        if (existing) {
             await this.prisma.payment.update({
                 where: { bookingId },
                 data: { 
                     intentId: paymentIntent.id, 
                     amount: Math.round(amount * 100),
                     status: 'created'
                 }
             });
        } else {
             await this.prisma.payment.create({
                 data: {
                     bookingId,
                     amount: Math.round(amount * 100),
                     currency,
                     provider: 'stripe',
                     status: 'created',
                     intentId: paymentIntent.id,
                     method: 'card'
                 }
             });
        }
    }

    return {
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id
    };
  }

  async createOmiseCharge(amount: number, token: string, description?: string) {
       // 1. Fetch Omise Keys from Settings Service
    const { publicKey, secretKey } = await this.settingsService.getOmiseConfig();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const omise = require('omise')({
        publicKey: publicKey,
        secretKey: secretKey,
    });

    try {
        const charge = await omise.charges.create({
            amount: Math.round(amount * 100),
            currency: 'thb',
            card: token,
            description
        });
        return charge;
    } catch (error: any) {
        console.error('Omise Error:', error);
        throw new BadRequestException(`Omise Charge Failed: ${error.message}`);
    }
  }

  async updateStatus(id: string, status: 'captured' | 'failed') {
    return this.prisma.payment.update({
      where: { id },
      data: { status }
    });
  }

  async handleWebhook(signature: string, payload: Buffer) {
    const { secretKey } = await this.settingsService.getStripeConfig();
    const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' as any });
    
    let event;
    try {
       event = JSON.parse(payload.toString());
    } catch (err) {
       throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const bookingId = paymentIntent.metadata.bookingId;
        console.log(`💰 Payment Succeeded for Booking: ${bookingId}`);

        if (bookingId) {
            // 1. Update Booking Status
            const updatedBooking = await this.prisma.booking.update({
                where: { id: bookingId },
                data: { status: 'confirmed' }, 
                include: { 
                    hotel: true, 
                    roomType: true, 
                    guests: true, // Fixed typo
                    payment: true
                }
            });

            // 2. Update Payment Record to Captured
            await this.prisma.payment.upsert({
                where: { bookingId },
                update: {
                    status: 'captured',
                    intentId: paymentIntent.id
                },
                create: {
                    amount: paymentIntent.amount / 100,
                    currency: paymentIntent.currency,
                    provider: 'stripe',
                    status: 'captured',
                    intentId: paymentIntent.id,
                    bookingId: bookingId,
                    method: 'card'
                }
            });

            // 3. Send Email Notification
            try {
                 await this.notificationsService.sendPaymentSuccessEmail(updatedBooking);
            } catch (emailErr) {
                console.error('Failed to send payment success email', emailErr);
            }
        }
    }

    return { received: true };
  }
}
