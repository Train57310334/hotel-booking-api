import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class OwnersService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string) {
    const where: any = {
      roles: { has: 'hotel_admin' }
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const owners = await this.prisma.user.findMany({
      where,
      include: {
        _count: {
            select: { Hotel: true } // Assuming relation is named 'Hotel' based on schema User.Hotel[]
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return owners.map(o => ({
        ...o,
        hotelCount: o._count.Hotel
    }));
  }

  async create(data: any) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new BadRequestException('Email already in use');

    const passwordHash = await bcrypt.hash(data.password || '123456', 10);

    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        phone: data.phone,
        passwordHash,
        roles: ['hotel_admin']
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { Hotel: true }
    });
  }

  async update(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        // email: data.email // Usually don't allow email change simply
      }
    });
  }

  async remove(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
