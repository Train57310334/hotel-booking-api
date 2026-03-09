import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { EventsGateway } from '@/modules/events/events.gateway';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockPrisma = {
  booking: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    aggregate: jest.fn(),
    count: jest.fn(),
  },
  room: {
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  payment: { findFirst: jest.fn() },
  hotel: { findUnique: jest.fn() },
};

const mockInventoryService = {
  restoreInventory: jest.fn(),
  reduceInventory: jest.fn(),
  checkAvailability: jest.fn(),
};

const mockNotificationsService = {
  sendCancellationEmail: jest.fn(),
  sendBookingConfirmationEmail: jest.fn(),
  sendBookingReceivedEmail: jest.fn(),
};

const mockEventsGateway = {
  broadcastToHotel: jest.fn(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('BookingsService', () => {
  let service: BookingsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  // ─── getMyBookings ─────────────────────────────────────────────────────────
  describe('getMyBookings', () => {
    it('should return upcoming, active, and past booking groups (BUG #5)', async () => {
      const fakeBookings = [{ id: 'b1' }];
      mockPrisma.booking.findMany.mockResolvedValue(fakeBookings);

      const result = await service.getMyBookings('user-1');

      // Must return all 3 groups including active
      expect(result).toHaveProperty('upcoming');
      expect(result).toHaveProperty('active');
      expect(result).toHaveProperty('past');
      // findMany called 3 times: upcoming / active / past
      expect(mockPrisma.booking.findMany).toHaveBeenCalledTimes(3);
    });

    it('should throw NotFoundException when no userId provided', async () => {
      await expect(service.getMyBookings('')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── cancelBooking ─────────────────────────────────────────────────────────
  describe('cancelBooking', () => {
    const booking = {
      id: 'b1',
      userId: 'user-1',
      hotelId: 'h1',
      roomTypeId: 'rt1',
      checkIn: new Date('2026-04-01'),
      checkOut: new Date('2026-04-03'),
      status: 'confirmed',
    };

    beforeEach(() => {
      mockPrisma.booking.findUnique.mockResolvedValue(booking);
      mockPrisma.booking.update.mockResolvedValue({ ...booking, status: 'cancelled' });
    });

    it('should throw ForbiddenException when userId does not match (BUG #10)', async () => {
      await expect(service.cancelBooking('b1', 'other-user')).rejects.toThrow(ForbiddenException);
    });

    it('should call restoreInventory when cancelling an active booking (BUG #4)', async () => {
      await service.cancelBooking('b1', 'user-1');

      expect(mockInventoryService.restoreInventory).toHaveBeenCalledWith(
        'rt1',
        expect.arrayContaining([expect.any(Date)]),
      );
    });

    it('should NOT call restoreInventory when booking is already cancelled', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({ ...booking, status: 'cancelled' });

      await service.cancelBooking('b1', 'user-1');

      expect(mockInventoryService.restoreInventory).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      await expect(service.cancelBooking('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should send cancellation email', async () => {
      await service.cancelBooking('b1', 'user-1');
      expect(mockNotificationsService.sendCancellationEmail).toHaveBeenCalledWith(booking);
    });
  });

  // ─── updateStatus (cancel path) ───────────────────────────────────────────
  describe('updateStatus', () => {
    const HOTEL_ID = 'h1';
    const booking = {
      id: 'b1',
      hotelId: HOTEL_ID,
      roomId: null,
      roomTypeId: 'rt1',
      checkIn: new Date('2026-04-01'),
      checkOut: new Date('2026-04-02'),
      status: 'confirmed',
      leadName: 'Alice',
    };

    beforeEach(() => {
      mockPrisma.booking.findUnique.mockResolvedValue(booking);
      mockPrisma.booking.update.mockResolvedValue({ ...booking, status: 'cancelled' });
      mockPrisma.room.findUnique.mockResolvedValue(null);
    });

    it('should restore inventory when cancelling via updateStatus (BUG #4)', async () => {
      await service.updateStatus('b1', 'cancelled', HOTEL_ID);

      expect(mockInventoryService.restoreInventory).toHaveBeenCalledWith(
        'rt1',
        expect.any(Array),
      );
    });

    it('should NOT restore inventory when updating to confirmed', async () => {
      mockPrisma.booking.update.mockResolvedValue({ ...booking, status: 'confirmed' });

      await service.updateStatus('b1', 'confirmed', HOTEL_ID);

      expect(mockInventoryService.restoreInventory).not.toHaveBeenCalled();
    });

    it('should emit roomNumber (not UUID) in real-time event (BUG #11)', async () => {
      const bookingWithRoom = { ...booking, roomId: 'room-uuid-1' };
      mockPrisma.booking.findUnique.mockResolvedValue(bookingWithRoom);
      mockPrisma.booking.update.mockResolvedValue({ ...bookingWithRoom, status: 'confirmed' });
      mockPrisma.room.findUnique.mockResolvedValue({ roomNumber: '101A' });

      await service.updateStatus('b1', 'confirmed', HOTEL_ID);

      expect(mockEventsGateway.broadcastToHotel).toHaveBeenCalledWith(
        HOTEL_ID,
        'bookingUpdated',
        expect.objectContaining({ roomNumber: '101A' }),
      );
    });
  });

  // ─── generateInvoice ───────────────────────────────────────────────────────
  describe('generateInvoice', () => {
    const booking = {
      id: 'abc12345',
      hotelId: 'h1',
      hotel: { name: 'Test Hotel', address: '123 St', taxId: 'TX-999', contactEmail: 'a@a.com', contactPhone: '000' },
      roomType: { name: 'Deluxe' },
      checkIn: new Date('2026-04-01'),
      checkOut: new Date('2026-04-03'),
      totalAmount: 3000,
      leadName: 'Alice',
      guestsAdult: 2,
      folioCharges: [],
      payment: { status: 'captured', provider: 'stripe' },
    };

    beforeEach(() => {
      mockPrisma.booking.findUnique.mockResolvedValue(booking);
    });

    it('should calculate VAT on top of subtotal, not extract from it (BUG #3)', async () => {
      const invoice = await service.generateInvoice('abc12345');

      // subtotal = 3000 (base), tax = 3000 * 0.07 = 210, total = 3210
      expect(invoice.summary.subtotal).toBe(3000);
      expect(invoice.summary.tax).toBe(210);
      expect(invoice.summary.total).toBe(3210);
    });

    it('should use hotel taxId from DB, not hardcoded (BUG #12)', async () => {
      const invoice = await service.generateInvoice('abc12345');

      expect(invoice.hotel.taxId).toBe('TX-999');
    });
  });
});
