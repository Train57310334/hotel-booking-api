import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  room: { count: jest.fn() },
  inventoryCalendar: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
};

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  // ─── reduceInventory ───────────────────────────────────────────────────────
  describe('reduceInventory', () => {
    it('should throw NotFoundException when an inventory record has allotment <= 0', async () => {
      mockPrisma.room.count.mockResolvedValue(5);
      mockPrisma.inventoryCalendar.findUnique.mockResolvedValue({ allotment: 0, stopSale: false });

      const dateRange = [new Date('2026-04-01')];

      await expect(service.reduceInventory('rt1', dateRange)).rejects.toThrow(NotFoundException);
    });

    it('should decrement allotment when available', async () => {
      mockPrisma.room.count.mockResolvedValue(5);
      mockPrisma.inventoryCalendar.findUnique.mockResolvedValue({ allotment: 3 });
      mockPrisma.inventoryCalendar.update.mockResolvedValue({});

      const dateRange = [new Date('2026-04-01')];
      await service.reduceInventory('rt1', dateRange);

      expect(mockPrisma.inventoryCalendar.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { allotment: { decrement: 1 } },
        }),
      );
    });

    it('should create a new record with totalRooms-1 when no explicit record exists', async () => {
      mockPrisma.room.count.mockResolvedValue(10);
      mockPrisma.inventoryCalendar.findUnique.mockResolvedValue(null);
      mockPrisma.inventoryCalendar.create.mockResolvedValue({});

      const dateRange = [new Date('2026-04-01')];
      await service.reduceInventory('rt1', dateRange);

      expect(mockPrisma.inventoryCalendar.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ allotment: 9 }),
        }),
      );
    });
  });

  // ─── restoreInventory (BUG #4) ────────────────────────────────────────────
  describe('restoreInventory', () => {
    it('should increment allotment back on cancellation (BUG #4)', async () => {
      mockPrisma.room.count.mockResolvedValue(5);
      mockPrisma.inventoryCalendar.findUnique.mockResolvedValue({ allotment: 2 });
      mockPrisma.inventoryCalendar.update.mockResolvedValue({});

      const dateRange = [new Date('2026-04-01')];
      await service.restoreInventory('rt1', dateRange);

      expect(mockPrisma.inventoryCalendar.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { allotment: 3 }, // incremented back
        }),
      );
    });

    it('should NOT exceed totalRooms when restoring (BUG #4 - overflow guard)', async () => {
      mockPrisma.room.count.mockResolvedValue(5);
      mockPrisma.inventoryCalendar.findUnique.mockResolvedValue({ allotment: 5 }); // already at max
      mockPrisma.inventoryCalendar.update.mockResolvedValue({});

      const dateRange = [new Date('2026-04-01')];
      await service.restoreInventory('rt1', dateRange);

      // Should set to min(5+1, 5) = 5, not 6
      expect(mockPrisma.inventoryCalendar.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { allotment: 5 },
        }),
      );
    });

    it('should do nothing when no explicit inventory record exists (already at capacity)', async () => {
      mockPrisma.room.count.mockResolvedValue(5);
      mockPrisma.inventoryCalendar.findUnique.mockResolvedValue(null);

      const dateRange = [new Date('2026-04-01')];
      await service.restoreInventory('rt1', dateRange);

      // No update should happen if no record
      expect(mockPrisma.inventoryCalendar.update).not.toHaveBeenCalled();
    });
  });
});
