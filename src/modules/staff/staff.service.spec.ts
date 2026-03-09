import { Test, TestingModule } from '@nestjs/testing';
import { StaffService } from './staff.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  hotel: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  roleAssignment: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('StaffService', () => {
  let service: StaffService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
  });

  // ─── create ───────────────────────────────────────────────────────────────
  describe('create', () => {
    const hotel = {
      maxStaff: 5,
      _count: { RoleAssignment: 2 },
    };

    beforeEach(() => {
      mockPrisma.hotel.findUnique.mockResolvedValue(hotel);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 'new-staff', email: 'staff@test.com' });
      mockPrisma.roleAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.roleAssignment.create.mockResolvedValue({});
    });

    it('should throw BadRequestException when password is missing for new user (Bug fix)', async () => {
      await expect(
        service.create('h1', { email: 'new@test.com', name: 'Bob', role: 'reception' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when password is empty string for new user', async () => {
      await expect(
        service.create('h1', { email: 'new@test.com', name: 'Bob', role: 'reception', password: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create staff when all valid data is provided', async () => {
      const result = await service.create('h1', {
        email: 'staff@test.com',
        name: 'Bob',
        role: 'reception',
        password: 'SecurePass123!',
      });

      expect(result).toHaveProperty('id');
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('should NOT hash hardcoded password — must use provided password', async () => {
      let capturedPassword = '';
      mockPrisma.user.create.mockImplementation(async ({ data }) => {
        capturedPassword = data.passwordHash;
        return { id: 'u1', email: data.email };
      });

      const { bcrypt } = await import('bcryptjs' as any);
      
      await service.create('h1', {
        email: 'staff@test.com',
        name: 'Bob',
        role: 'reception',
        password: 'MyPassword',
      });

      // The stored hash must NOT equal '123456' (the old hardcoded default)
      const wasDefault = await (await import('bcryptjs')).compare('123456', capturedPassword);
      expect(wasDefault).toBe(false);
    });

    it('should throw BadRequestException when at staff limit', async () => {
      mockPrisma.hotel.findUnique.mockResolvedValue({ maxStaff: 2, _count: { RoleAssignment: 2 } });

      await expect(
        service.create('h1', { email: 's@s.com', name: 'X', role: 'reception', password: 'pass' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when assigning owner role', async () => {
      await expect(
        service.create('h1', { email: 's@s.com', name: 'X', role: 'owner', password: 'pass' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user is already staff at this hotel', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });
      mockPrisma.roleAssignment.findFirst.mockResolvedValue({ id: 'existing-role' });

      await expect(
        service.create('h1', { email: 'existing@test.com', name: 'Bob', role: 'reception', password: 'pass' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── updateRole ───────────────────────────────────────────────────────────
  describe('updateRole', () => {
    it('should throw NotFoundException when staff not found at hotel', async () => {
      mockPrisma.roleAssignment.findFirst.mockResolvedValue(null);

      await expect(service.updateRole('h1', 'u1', 'admin')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to modify the hotel owner', async () => {
      mockPrisma.roleAssignment.findFirst.mockResolvedValue({ id: 'ra1', role: 'owner' });

      await expect(service.updateRole('h1', 'u1', 'admin')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when trying to assign owner role', async () => {
      mockPrisma.roleAssignment.findFirst.mockResolvedValue({ id: 'ra1', role: 'reception' });

      await expect(service.updateRole('h1', 'u1', 'owner')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('should throw NotFoundException when staff not found', async () => {
      mockPrisma.roleAssignment.findFirst.mockResolvedValue(null);

      await expect(service.remove('h1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to remove hotel owner', async () => {
      mockPrisma.roleAssignment.findFirst.mockResolvedValue({ id: 'ra1', role: 'owner' });

      await expect(service.remove('h1', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should delete the role assignment for valid staff', async () => {
      mockPrisma.roleAssignment.findFirst.mockResolvedValue({ id: 'ra1', role: 'reception' });
      mockPrisma.roleAssignment.delete.mockResolvedValue({});

      await service.remove('h1', 'u1');

      expect(mockPrisma.roleAssignment.delete).toHaveBeenCalledWith({ where: { id: 'ra1' } });
    });
  });
});
