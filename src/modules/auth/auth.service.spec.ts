import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from '../notifications/notifications.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  hotel: { create: jest.fn(), findUnique: jest.fn() },
  roleAssignment: { create: jest.fn() },
  subscriptionPlan: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('fake-jwt-token'),
};

const mockNotifications = {
  sendPasswordResetEmail: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─── register ─────────────────────────────────────────────────────────────
  describe('register', () => {
    it('should throw ConflictException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(
        service.register({ email: 'test@test.com', password: 'pass123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user and return a token on success', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 'new-user', email: 'new@test.com', roles: ['user'] });

      const result = await service.register({ email: 'new@test.com', password: 'password' });

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
    });

    it('should hash the password before storing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      let storedHash = '';
      mockPrisma.user.create.mockImplementation(async ({ data }) => {
        storedHash = data.passwordHash;
        return { id: 'u1', email: data.email, roles: ['user'] };
      });

      await service.register({ email: 'x@x.com', password: 'plaintext' });

      // Stored hash should NOT be the plain password
      expect(storedHash).not.toBe('plaintext');
      // And it must be a valid bcrypt hash
      expect(await bcrypt.compare('plaintext', storedHash)).toBe(true);
    });
  });

  // ─── login ────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@x.com', password: 'pw' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const hashed = await bcrypt.hash('correct-pass', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        passwordHash: hashed,
        roleAssignments: [],
        roles: ['user'],
      });

      await expect(
        service.login({ email: 'u@u.com', password: 'WRONG' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return a token on successful login', async () => {
      const hashed = await bcrypt.hash('secret123', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'u@u.com',
        passwordHash: hashed,
        roleAssignments: [],
        roles: ['user'],
      });

      const result = await service.login({ email: 'u@u.com', password: 'secret123' });

      expect(result).toHaveProperty('token', 'fake-jwt-token');
    });
  });

  // ─── resetPassword ────────────────────────────────────────────────────────
  describe('resetPassword', () => {
    it('should throw UnauthorizedException for expired token', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null); // no matching token with future expiry

      await expect(service.resetPassword('bad-token', 'newpass')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should clear the reset token after successful reset', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'u1' });
      mockPrisma.user.update.mockResolvedValue({});

      await service.resetPassword('good-token', 'NewPassword123');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resetPasswordToken: null,
            resetPasswordExpires: null,
          }),
        }),
      );
    });

    it('should hash the new password before storing', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'u1' });
      let storedHash = '';
      mockPrisma.user.update.mockImplementation(async ({ data }) => {
        storedHash = data.passwordHash;
        return {};
      });

      await service.resetPassword('good-token', 'NewPlainPass');

      expect(storedHash).not.toBe('NewPlainPass');
      expect(await bcrypt.compare('NewPlainPass', storedHash)).toBe(true);
    });
  });

  // ─── forgotPassword ───────────────────────────────────────────────────────
  describe('forgotPassword', () => {
    it('should silently return success for non-existent email (anti-enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword('ghost@x.com');

      // Should NOT throw — silently succeed to prevent email enumeration
      expect(result).toEqual({ success: true });
      expect(mockNotifications.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should send password reset email for valid user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'u@u.com', name: 'Alice' });
      mockPrisma.user.update.mockResolvedValue({});

      await service.forgotPassword('u@u.com');

      expect(mockNotifications.sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'u@u.com' }),
        expect.any(String), // the raw token
      );
    });
  });
});
