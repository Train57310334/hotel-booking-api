import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  /** 📌 มอบหมาย role ให้ user */
  async assignRole(userId: string, role: string, hotelId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const validRoles = ['user', 'hotel_admin', 'platform_admin'];
    if (!validRoles.includes(role))
      throw new BadRequestException(`Invalid role: ${role}`);

    if (role === 'hotel_admin' && !hotelId)
      throw new BadRequestException('hotelId is required for hotel_admin role');

    const existing = await this.prisma.roleAssignment.findFirst({
      where: { userId, role, hotelId },
    });
    if (existing) return existing;

    return this.prisma.roleAssignment.create({
      data: { userId, role, hotelId: hotelId ?? null },
    });
  }

  /** 📌 ดึง role ทั้งหมดของ user */
  async getRolesByUser(userId: string) {
    return this.prisma.roleAssignment.findMany({
      where: { userId },
      include: {
        hotel: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** 📌 ลบ role */
  async revokeRole(id: string) {
    const role = await this.prisma.roleAssignment.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role assignment not found');
    return this.prisma.roleAssignment.delete({ where: { id } });
  }

  /** 📌 รายชื่อ hotel_admin ทั้งหมด */
  async listHotelAdmins() {
    return this.prisma.roleAssignment.findMany({
      where: { role: 'hotel_admin' },
      include: {
        user: { select: { id: true, email: true, name: true } },
        hotel: { select: { id: true, name: true } },
      },
    });
  }
}
