import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string, status?: string) {
    const where: any = {};

    if (status && status !== 'All') {
      where.status = status.toLowerCase();
    }

    if (search) {
      where.OR = [
        { bookingId: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
        { booking: { leadName: { contains: search, mode: 'insensitive' } } }
      ];
    }

    return this.prisma.payment.findMany({
      where,
      include: {
        booking: {
          select: {
            id: true,
            leadName: true,
            room: { select: { id: true } }
          }
        }
      },
      orderBy: { booking: { createdAt: 'desc' } }
    });
  }

  async createPaymentIntent(amount: number, currency: string = 'thb', description?: string) {
    // 1. Fetch Stripe Secret from Settings
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'stripeSecret' }
    });

    if (!setting || !setting.value || setting.value.trim() === '') {
      // Fallback for demo/dev if no key set, or throw error
      throw new BadRequestException('Payment gateway not configured. Please contact admin.');
    }

    try {
      // 2. Init Stripe
      const stripe = new Stripe(setting.value, { 
        apiVersion: '2024-06-20' as any 
      });

      // 3. Create Intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe uses smallest currency unit (e.g., satang/cents)
        currency: currency.toLowerCase(),
        description: description,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id
      };
    } catch (error: any) {
      console.error('Stripe Error:', error);
      throw new BadRequestException(`Payment processing failed: ${error.message}`);
    }
  }
}
