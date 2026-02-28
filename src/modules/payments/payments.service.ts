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
    // 1. Fetch Online Payments
    const payments = await this.prisma.payment.findMany({
      where: {
        status: status && status !== 'manual' ? status : undefined,
        booking: search ? { leadName: { contains: search, mode: 'insensitive' } } : undefined
      },
      include: { booking: true },
    });

    // 2. Fetch Manual Payments (FolioCharges) if status is not 'pending'/'failed' (since manual is always captured)
    let manualPayments = [];
    if (!status || status === 'manual' || status === 'captured') {
        manualPayments = await this.prisma.folioCharge.findMany({
            where: {
                type: 'PAYMENT',
                booking: search ? { leadName: { contains: search, mode: 'insensitive' } } : undefined
            },
            include: { booking: true }
        });
    }

    // 3. Normalize & Merge
    const normalizedOnline = payments.map(p => ({
        id: p.id,
        bookingId: p.bookingId,
        amount: (p.status === 'created' || p.status === 'pending') ? p.amount / 100 : p.amount, // Fix inconsistent unit storage
        provider: p.provider,
        method: p.method || p.provider,
        status: p.status === 'created' ? 'pending' : p.status,
        date: p.createdAt,
        reference: p.chargeId || p.intentId,
        booking: p.booking,
        isManual: false
    }));

    const normalizedManual = manualPayments.map(p => ({
        id: p.id,
        bookingId: p.bookingId,
        amount: Math.abs(p.amount),
        provider: 'manual',
        method: p.description.includes('CASH') ? 'Cash' : 'Bank Transfer',
        status: 'captured',
        date: p.createdAt,
        reference: p.description, // Contains full description including Ref
        booking: p.booking,
        isManual: true
    }));

    const all = [...normalizedOnline, ...normalizedManual];
    
    // Sort by Date Descending
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async createPaymentIntent(amount: number, currency = 'thb', description?: string, bookingId?: string) {
    if (bookingId) {
        const booking = await this.prisma.booking.findUnique({
             where: { id: bookingId },
             include: { hotel: true }
        });
        if (booking && !booking.hotel.hasOnlinePayment) {
            throw new BadRequestException('Your current plan does not support online payments. Please upgrade to PRO or use Bank Transfer/Cash.');
        }
    }

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

  async createOmiseCharge(amount: number, token: string, description?: string, bookingId?: string) {
    if (bookingId) {
        const booking = await this.prisma.booking.findUnique({
             where: { id: bookingId },
             include: { hotel: true }
        });
        if (booking && !booking.hotel.hasOnlinePayment) {
            throw new BadRequestException('Your current plan does not support online payments. Please upgrade to PRO or use Bank Transfer/Cash.');
        }
    }

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

  async createOmisePromptPaySource(amount: number, bookingId: string, description?: string) {
    const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: { hotel: true }
    });
    if (!booking) throw new BadRequestException('Booking not found');
    if (!booking.hotel.hasOnlinePayment) {
        throw new BadRequestException('Your current plan does not support online payments. Please upgrade to PRO or use Bank Transfer/Cash.');
    }

    const { publicKey, secretKey } = await this.settingsService.getOmiseConfig();
    const omise = require('omise')({ publicKey, secretKey });

    try {
        // 1. Create Source (PromptPay)
        const source = await omise.sources.create({
            amount: Math.round(amount * 100),
            currency: 'thb',
            type: 'promptpay'
        });

        // 2. Create Charge associated with the Source
        const charge = await omise.charges.create({
            amount: Math.round(amount * 100),
            currency: 'thb',
            source: source.id,
            description: description || `Booking ID: ${bookingId}`,
            metadata: { bookingId } // Pass booking ID for Webhook mapping
        });

        // 3. Upsert Payment Record (Pending)
        await this.prisma.payment.upsert({
            where: { bookingId },
            update: {
                status: 'created',
                intentId: charge.id, // we store charge ID as the reference intent
                amount: amount,
                provider: 'omise',
                method: 'promptpay',
                chargeId: charge.id
            },
            create: {
                bookingId: bookingId,
                amount: amount,
                currency: 'thb',
                provider: 'omise',
                status: 'created',
                intentId: charge.id,
                chargeId: charge.id,
                method: 'promptpay'
            }
        });

        // The Charge object contains the 'authorize_uri' which will contain the actual QR Code URL inside 'scannable_code'
        // For promptpay, charge.source.scannable_code.image.download_uri is the actual SVG string of the QR
        return {
            chargeId: charge.id,
            qrCodeUrl: charge.source?.scannable_code?.image?.download_uri,
            amount: amount,
            sourceId: source.id
        };

    } catch (error: any) {
        console.error('Omise PromptPay Error:', error);
        throw new BadRequestException(`PromptPay Generation Failed: ${error.message}`);
    }
  }

  async handleOmiseWebhook(payload: any) {
    // Basic verification: We extract the event type and object
    if (!payload || payload.object !== 'event') {
        return { received: true };
    }

    const eventData = payload.data;
    const type = payload.key; // e.g., 'charge.complete'

    if (type === 'charge.complete' && eventData.status === 'successful') {
        const metadata = eventData.metadata;
        
        if (metadata && metadata.bookingId) {
            const bookingId = metadata.bookingId;
            console.log(`✅ Omise Webhook: Payment Success for Booking ${bookingId}`);

            // 1. Update Booking Status Atomically
            const updateResult = await this.prisma.booking.updateMany({
                where: { id: bookingId, status: { not: 'confirmed' } },
                data: { status: 'confirmed' }
            });

            if (updateResult.count === 0) {
                 console.log(`Booking ${bookingId} already confirmed or not found.`);
            } else {
                 // WE were the ones to confirm it, send email.
                 const updatedBooking = await this.prisma.booking.findUnique({
                      where: { id: bookingId },
                      include: { hotel: true, roomType: true, guests: true, payment: true }
                 });

                 if (updatedBooking) {
                      try {
                          await this.notificationsService.sendPaymentSuccessEmail(updatedBooking as any);
                      } catch (emailErr) {
                          console.error('Failed to send payment success email via Omise Webhook', emailErr);
                      }
                 }
            }

            // 2. Update Payment Record
            await this.prisma.payment.upsert({
                where: { bookingId },
                update: {
                    status: 'captured',
                    chargeId: eventData.id
                },
                create: {
                    amount: eventData.amount / 100, // Omise is in cents
                    currency: eventData.currency,
                    provider: 'omise',
                    status: 'captured',
                    chargeId: eventData.id,
                    bookingId: bookingId,
                    method: eventData.source?.type || 'omise'
                }
            });
        }
    }

    return { received: true };
  }

  async updateStatus(id: string, status: 'captured' | 'failed') {
    return this.prisma.payment.update({
      where: { id },
      data: { status }
    });
  }

  async createUpgradeIntent(hotelId: string) {
    const { secretKey } = await this.settingsService.getStripeConfig();
    const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' as any });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 99000, // 990.00 THB
      currency: 'thb',
      description: 'Upgrade to PRO Plan (1 Month)',
      metadata: { 
          type: 'upgrade',
          hotelId 
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id
    };
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
        const metadata = paymentIntent.metadata;

        console.log(`💰 Payment Succeeded: ${paymentIntent.id}`, metadata);

        // CASE 1: Booking Payment
        if (metadata.bookingId) {
            const bookingId = metadata.bookingId;
            
            // 💡 IDEMPOTENCY CHECK & ATOMIC UPDATE
            // Only update booking if it's NOT already confirmed
            const updateResult = await this.prisma.booking.updateMany({
                 where: { id: bookingId, status: { not: 'confirmed' } },
                 data: { status: 'confirmed' }
            });

            if (updateResult.count === 0) {
                 // It was ALREADY confirmed. This means another webhook processed it perfectly.
                 console.log(`Booking ${bookingId} already confirmed. Skipping duplicate Webhook for Intent ${paymentIntent.id}`);
                 return { received: true };
            }

            // If we get here, WE were the ones to confirm it.
            // Fetch the updated booking for the email:
            const updatedBooking = await this.prisma.booking.findUnique({
                 where: { id: bookingId },
                 include: { hotel: true, roomType: true, guests: true, payment: true }
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
            if (updatedBooking) {
                try {
                     await this.notificationsService.sendPaymentSuccessEmail(updatedBooking as any);
                } catch (emailErr) {
                    console.error('Failed to send payment success email', emailErr);
                }
            }
        }

        // CASE 2: Subscription Upgrade
        if (metadata.type === 'upgrade' && metadata.hotelId) {
            const hotelId = metadata.hotelId;
            const daysToAdd = 30;
            const newExpiry = new Date();
            newExpiry.setDate(newExpiry.getDate() + daysToAdd);

            await this.prisma.hotel.update({
                where: { id: hotelId },
                data: {
                    package: 'PRO',
                    subscriptionEnd: newExpiry
                }
            });

            console.log(`🚀 Hotel ${hotelId} upgraded to PRO until ${newExpiry.toISOString()}`);
        }
    }

    return { received: true };
  }
  async createManualPayment(bookingId: string, amount: number, method: 'CASH' | 'BANK_TRANSFER', reference?: string) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const payment = await this.prisma.folioCharge.create({
      data: {
        bookingId,
        amount: -amount, // Negative for credit/payment
        description: `Payment via ${method}${reference ? ` (Ref: ${reference})` : ''}`,
        type: 'PAYMENT'
      }
    });

    // Auto-confirm booking if it's pending
    await this.prisma.booking.update({
        where: { id: bookingId, status: 'pending' },
        data: { status: 'confirmed' }
    }).catch(() => {}); // Ignore if not found or already confirmed

    return payment;
  }
}
