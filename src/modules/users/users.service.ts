import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  create(data: { email: string; passwordHash: string; name?: string }) {
    return this.prisma.user.create({ data });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findAll(search?: string) {
    const where: any = {};
    // Optional: Filter strict 'user' role if enforced, 
    // but typically guests are just users.
    // where.roles = { has: 'user' }; 

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    return this.prisma.user.findMany({
      where,
      include: {
        _count: { select: { bookings: true } },
        bookings: {
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

  update(id: string, data: any) {
    // Remove sensitive fields if any or strict DTO
    const { password, ...updates } = data; 
    return this.prisma.user.update({
      where: { id },
      data: updates
    });
  }
}
