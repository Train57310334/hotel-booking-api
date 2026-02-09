import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  create(data: { email: string; passwordHash: string; name?: string }) {
    return this.prisma.user.create({ data });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findAll(search?: string, hotelId?: string) {
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (hotelId) {
       where.bookings = { some: { hotelId } };
    }

    // Filter count and last booking based on hotelId too
    return this.prisma.user.findMany({
      where,
      include: {
        _count: { 
            select: { bookings: { where: hotelId ? { hotelId } : {} } } 
        },
        bookings: {
           where: hotelId ? { hotelId } : {},
           take: 1,
           orderBy: { createdAt: 'desc' },
           select: { createdAt: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  me(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        bookings: {
          orderBy: { createdAt: 'desc' },
          include: { roomType: true }
        },
        _count: { select: { bookings: true } }
      }
    });
  }

  update(id: string, data: any) {
    // Remove sensitive fields if any or strict DTO
    const { password, ...updates } = data; 
    return this.prisma.user.update({
      where: { id },
      data: updates
    });
  }

  async changePassword(userId: string, oldPass: string, newPass: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) throw new Error('User not found');

    const isValid = await bcrypt.compare(oldPass, user.passwordHash);
    if (!isValid) throw new Error('Invalid current password');

    const hashed = await bcrypt.hash(newPass, 10);
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashed }
    });
  }
}
