import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('StaffController', () => {
  let controller: StaffController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffController],
      providers: [
        {
          provide: StaffService,
          useValue: {
            findAll: jest.fn(),
            create: jest.fn(),
            updateRole: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: { user: { findUnique: jest.fn() } },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<StaffController>(StaffController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
