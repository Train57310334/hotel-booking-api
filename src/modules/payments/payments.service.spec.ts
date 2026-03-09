import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { BadRequestException } from '@nestjs/common';

// ─── Mock the Stripe constructor ─────────────────────────────────────────────
// Since handleWebhook creates `new Stripe(secretKey)` locally, we must mock
// the Stripe constructor so all instances share our mock methods.
const mockConstructEvent = jest.fn();
const mockPaymentIntentsCreate = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: { create: mockPaymentIntentsCreate },
    webhooks: { constructEvent: mockConstructEvent },
  }));
});

// ─── Other Mocks ──────────────────────────────────────────────────────────────
const mockPrisma = {
  booking: {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    findFirst: jest.fn(),
  },
  payment: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    findUnique: jest.fn(),
  },
  hotel: { findUnique: jest.fn() },
};

const mockNotifications = {
  sendPaymentSuccessEmail: jest.fn(),
  sendBookingConfirmationEmail: jest.fn(),
  sendBookingReceivedEmail: jest.fn(),
};

const mockSettings = {
  get: jest.fn().mockResolvedValue(null),
  getStripeConfig: jest.fn().mockResolvedValue({ secretKey: 'sk_test_fake', currency: 'thb' }),
};

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset the STRIPE_WEBHOOK_SECRET to be controlled per-test
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: SettingsService, useValue: mockSettings },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  // ─── createPaymentIntent ───────────────────────────────────────────────────
  describe('createPaymentIntent', () => {
    const booking = {
      id: 'b1',
      hotelId: 'h1',
      totalAmount: 3000,
      status: 'pending',
      leadEmail: 'a@a.com',
      leadName: 'Alice',
      hotel: { hasOnlinePayment: true }, // ← required: service accesses booking.hotel.hasOnlinePayment
    };

    beforeEach(() => {
      mockPrisma.booking.findUnique.mockResolvedValue(booking);
      mockPaymentIntentsCreate.mockResolvedValue({ client_secret: 'pi_secret', id: 'pi_1' });
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.payment.create.mockResolvedValue({});
    });

    it('should store amount as THB (not satang) in Payment record (BUG #2)', async () => {
      await service.createPaymentIntent(3000, 'thb', 'Test Booking', 'b1');

      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 3000, // THB, NOT 300000 (satang)
          }),
        }),
      );
    });

    it('should pass amount in SATANG to Stripe API (multiply by 100)', async () => {
      await service.createPaymentIntent(3000, 'thb', 'Test Booking', 'b1');

      expect(mockPaymentIntentsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 300000, // satang to Stripe
          currency: 'thb',
        }),
      );
    });

    it('should throw BadRequestException when hotel does not support online payments', async () => {
      // Override booking mock to have hotel.hasOnlinePayment=false for this test
      mockPrisma.booking.findUnique.mockResolvedValue({
        ...booking,
        hotel: { hasOnlinePayment: false },
      });

      await expect(
        service.createPaymentIntent(3000, 'thb', 'Test', 'b1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── handleWebhook ────────────────────────────────────────────────────────
  describe('handleWebhook (Stripe)', () => {
    it('should throw BadRequestException when Stripe signature is invalid (BUG #1)', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
      mockConstructEvent.mockImplementation(() => {
        throw new Error('No signatures found matching the expected signature for payload');
      });

      await expect(
        service.handleWebhook('bad-sig', Buffer.from('payload')),
      ).rejects.toThrow(BadRequestException);
    });

    it('should process payment_intent.succeeded event and confirm booking', async () => {
      // Use no-secret path (JSON fallback) for positive test
      const fakeEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
            metadata: { bookingId: 'b1' },
            amount: 300000,
          },
        },
      };
      // No STRIPE_WEBHOOK_SECRET → uses JSON.parse fallback
      const payload = Buffer.from(JSON.stringify(fakeEvent));

      mockPrisma.booking.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'b1',
        status: 'pending',
        leadEmail: 'a@a.com',
        hotel: { name: 'Hotel' },
        roomType: { name: 'Deluxe' },
        guests: [],
        payment: null,
      });
      mockPrisma.payment.upsert.mockResolvedValue({});

      await service.handleWebhook('', payload);

      expect(mockPrisma.booking.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'confirmed' }),
        }),
      );
    });

    it('should be idempotent: skip already-confirmed bookings (BUG #1)', async () => {
      const fakeEvent = {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123', metadata: { bookingId: 'b1' }, amount: 300000 } },
      };
      const payload = Buffer.from(JSON.stringify(fakeEvent));
      // updateMany returns count=0 → booking already confirmed
      mockPrisma.booking.updateMany.mockResolvedValue({ count: 0 });

      await service.handleWebhook('', payload);

      // Email should NOT be sent when booking was already confirmed
      expect(mockNotifications.sendBookingConfirmationEmail).not.toHaveBeenCalled();
    });
  });
});
