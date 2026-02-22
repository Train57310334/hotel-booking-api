import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async findAll(hotelId: string) {
    return this.prisma.user.findMany({
      where: {
        roleAssignments: {
          some: { hotelId }
        }
      },
      include: {
        roleAssignments: {
          where: { hotelId }
        }
      }
    }).then(users => users.map(u => ({
        ...u,
        role: u.roleAssignments[0]?.role || 'unknown'
    })));
  }

  async create(hotelId: string, data: any) {
      // 0. Check Max Staff Limit
      const hotel = await this.prisma.hotel.findUnique({
          where: { id: hotelId },
          select: { maxStaff: true, _count: { select: { RoleAssignment: true } } }
      });

      if (!hotel) {
          throw new NotFoundException('Hotel not found');
      }

      const currentStaffCount = hotel._count?.RoleAssignment || 0;

      if (currentStaffCount >= hotel.maxStaff) {
          throw new BadRequestException(`Your plan is limited to ${hotel.maxStaff} staff member(s). Please upgrade your plan to add more staff.`);
      }

      // 1. Check if user exists by email
      let user = await this.prisma.user.findUnique({ where: { email: data.email } });

      if (!user) {
          // Create new user
          const hashedPassword = await bcrypt.hash(data.password || '123456', 10);
          user = await this.prisma.user.create({
              data: {
                  email: data.email,
                  name: data.name,
                  passwordHash: hashedPassword,
                  phone: data.phone
              }
          });
      }

      // 2. Check existing assignment
      const existingAssignment = await this.prisma.roleAssignment.findFirst({
         where: { userId: user.id, hotelId }
      });

      if (existingAssignment) {
          throw new BadRequestException('User is already staff at this hotel.');
      }

      if (data.role === 'owner') {
          throw new BadRequestException('Cannot assign owner role via this endpoint.');
      }

      // 3. Assign Role
      await this.prisma.roleAssignment.create({
          data: {
              userId: user.id,
              hotelId,
              role: data.role // 'admin', 'reception', 'manager'
          }
      });

      return user;
  }

  async updateRole(hotelId: string, userId: string, role: string) {
      const assignment = await this.prisma.roleAssignment.findFirst({
          where: { userId, hotelId }
      });

      if (!assignment) throw new NotFoundException('Staff not found');
      if (assignment.role === 'owner') throw new BadRequestException('Cannot modify the role of the hotel owner.');
      if (role === 'owner') throw new BadRequestException('Cannot assign the owner role.');

      return this.prisma.roleAssignment.update({
          where: { id: assignment.id },
          data: { role }
      });
  }

  async remove(hotelId: string, userId: string) {
      const assignment = await this.prisma.roleAssignment.findFirst({
          where: { userId, hotelId }
      });

      if (!assignment) throw new NotFoundException('Staff not found');
      if (assignment.role === 'owner') throw new BadRequestException('Cannot remove the hotel owner.');
      
      return this.prisma.roleAssignment.delete({
          where: { id: assignment.id }
      });
  }
}
