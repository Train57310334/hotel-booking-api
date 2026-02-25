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

  async findAll(search?: string, hotelId?: string, page: number = 1, limit: number = 20) {
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

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
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
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      this.prisma.user.count({ where })
    ]);

    return {
        data,
        meta: {
            total,
            page: pageNum,
            last_page: Math.ceil(total / limitNum),
            limit: limitNum
        }
    };
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
    // SECURITY: Prevent privilege escalation. Roles & Passwords must be handled by specific endpoints.
    const { passwordHash, password, roles, roleAssignments, ...safeUpdates } = data; 
    
    return this.prisma.user.update({
      where: { id },
      data: safeUpdates
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
