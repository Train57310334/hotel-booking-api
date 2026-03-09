import { Test, TestingModule } from '@nestjs/testing';
import { PromotionsService } from './promotions.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  promotion: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  hotel: { findUnique: jest.fn() },
};

describe('PromotionsService', () => {
  let service: PromotionsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PromotionsService>(PromotionsService);
  });

  describe('validateCode', () => {
    const validPromo = {
      code: 'SAVE10',
      type: 'percent',
      value: 10,
      startDate: new Date(Date.now() - 86400000), // yesterday
      endDate: new Date(Date.now() + 86400000),   // tomorrow
      hotel: { hasPromotions: true },
    };

    it('should throw NotFoundException for unknown code', async () => {
      mockPrisma.promotion.findUnique.mockResolvedValue(null);

      await expect(service.validateCode('INVALID', 1000)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for expired code', async () => {
      mockPrisma.promotion.findUnique.mockResolvedValue({
        ...validPromo,
        endDate: new Date(Date.now() - 86400000), // yesterday = expired
      });

      await expect(service.validateCode('SAVE10', 1000)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for not-yet-active code', async () => {
      mockPrisma.promotion.findUnique.mockResolvedValue({
        ...validPromo,
        startDate: new Date(Date.now() + 86400000), // tomorrow = not yet active
      });

      await expect(service.validateCode('SAVE10', 1000)).rejects.toThrow(BadRequestException);
    });

    it('should calculate percent discount correctly', async () => {
      mockPrisma.promotion.findUnique.mockResolvedValue(validPromo);

      const result = await service.validateCode('SAVE10', 2000);
      expect(result.discountAmount).toBe(200); // 10% of 2000
    });

    it('should cap discount at purchaseAmount for percent type', async () => {
      mockPrisma.promotion.findUnique.mockResolvedValue({
        ...validPromo,
        type: 'percent',
        value: 110, // 110% discount (> total)
      });

      const result = await service.validateCode('SAVE10', 500);
      expect(result.discountAmount).toBe(500); // capped at 500
    });

    it('should calculate flat discount correctly', async () => {
      mockPrisma.promotion.findUnique.mockResolvedValue({
        ...validPromo,
        type: 'flat',
        value: 200, // 200 baht off
      });

      const result = await service.validateCode('FLAT200', 1000);
      expect(result.discountAmount).toBe(200);
    });

    it('should cap flat discount at purchaseAmount', async () => {
      mockPrisma.promotion.findUnique.mockResolvedValue({
        ...validPromo,
        type: 'flat',
        value: 9999, // more than purchase price
      });

      const result = await service.validateCode('BIG', 300);
      expect(result.discountAmount).toBe(300); // capped at 300
    });

    it('should throw if hotel subscription downgraded and no longer hasPromotions', async () => {
      mockPrisma.promotion.findUnique.mockResolvedValue({
        ...validPromo,
        hotel: { hasPromotions: false }, // downgraded
      });

      await expect(service.validateCode('SAVE10', 1000)).rejects.toThrow(BadRequestException);
    });
  });
});
