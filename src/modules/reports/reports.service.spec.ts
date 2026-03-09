import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../common/prisma/prisma.service';

const mockPrisma = {
  room: { count: jest.fn() },
  booking: {
    findMany: jest.fn(),
    aggregate: jest.fn(),
    count: jest.fn(),
  },
  expense: {
    findMany: jest.fn(),
  },
};

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  // ─── getOccupancy ─────────────────────────────────────────────────────────
  describe('getOccupancy', () => {
    it('should fetch all bookings ONCE (no N+1 queries) (Bug fix)', async () => {
      mockPrisma.room.count.mockResolvedValue(10);
      mockPrisma.booking.findMany.mockResolvedValue([]);

      const from = new Date('2026-04-01');
      const to = new Date('2026-04-07');
      await service.getOccupancy('h1', from, to);

      // findMany should be called ONCE for all bookings, NOT once per day
      expect(mockPrisma.booking.findMany).toHaveBeenCalledTimes(1);
      // booking.count should NEVER be called (that was the N+1 pattern)
      expect(mockPrisma.booking.count).not.toHaveBeenCalled();
    });

    it('should use hotel-scoped totalRooms, not hardcoded 50 (Bug fix)', async () => {
      mockPrisma.room.count.mockResolvedValue(20);
      mockPrisma.booking.findMany.mockResolvedValue([]);

      const from = new Date('2026-04-01');
      const to = new Date('2026-04-01');
      await service.getOccupancy('h1', from, to);

      // Should query rooms scoped to hotel, not use a fallback
      expect(mockPrisma.room.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            roomType: expect.objectContaining({ hotelId: 'h1' }),
          }),
        }),
      );
    });

    it('should return 0% occupancy when no rooms are configured', async () => {
      mockPrisma.room.count.mockResolvedValue(0);
      mockPrisma.booking.findMany.mockResolvedValue([]);

      const from = new Date('2026-04-01');
      const to = new Date('2026-04-01');

      const result = await service.getOccupancy('h1', from, to);

      expect(result[0].rate).toBe(0);
    });

    it('should correctly count occupied rooms using in-memory filter', async () => {
      mockPrisma.room.count.mockResolvedValue(10);
      // 5 rooms checking in Apr 1, checking out Apr 3 → overlap with Apr 1
      mockPrisma.booking.findMany.mockResolvedValue(
        Array(5).fill({
          checkIn: new Date('2026-04-01'),
          checkOut: new Date('2026-04-03'),
        }),
      );

      const from = new Date('2026-04-01');
      const to = new Date('2026-04-01');

      const result = await service.getOccupancy('h1', from, to);

      expect(result[0].rate).toBe(50); // 5/10 = 50%
    });
  });

  // ─── getSummary ───────────────────────────────────────────────────────────
  describe('getSummary', () => {
    it('should use checkIn date range for revenue, not createdAt (Bug fix)', async () => {
      mockPrisma.booking.aggregate.mockResolvedValue({ _sum: { totalAmount: 10000 } });
      mockPrisma.booking.count.mockResolvedValue(3);
      (mockPrisma as any).expense = { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 500 } }) };

      const from = new Date('2026-04-01');
      const to = new Date('2026-04-30');
      await service.getSummary('h1', from, to);

      expect(mockPrisma.booking.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            checkIn: expect.objectContaining({ gte: from }),
          }),
        }),
      );

      // createdAt should NOT appear in the where clause
      const callArgs = (mockPrisma.booking.aggregate as jest.Mock).mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('createdAt');
    });

    it('should calculate profit = revenue - expenses', async () => {
      mockPrisma.booking.aggregate.mockResolvedValue({ _sum: { totalAmount: 10000 } });
      mockPrisma.booking.count.mockResolvedValue(5);
      (mockPrisma as any).expense = {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 3000 } }),
      };

      const result = await service.getSummary('h1', new Date(), new Date());
      expect(result.totalProfit).toBe(7000);
    });
  });
});
