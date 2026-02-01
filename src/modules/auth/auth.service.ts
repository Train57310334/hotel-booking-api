import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  // ✅ Register
  async register(data: { email: string; password: string; name?: string; phone?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: hashed,
        name: data.name,
        phone: data.phone,
        roles: ['user'], // default role
      },
    });

    const token = this.generateToken(user);
    return { user, token };
  }

  // ✅ Login
  async login(data: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({ 
        where: { email: data.email },
        include: { roleAssignments: true } // Fetch assignments
    });
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    const token = this.generateToken(user);
    return { user, token };
  }

  // ✅ Get Profile
  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        phone: true, 
        roles: true,
        roleAssignments: {
            include: { hotel: true }
        }
      },
    });
  }

  // ✅ Helper: JWT Token
  private generateToken(user: any) {
    // Find first hotelId from assignments if available
    const hotelId = user.roleAssignments && user.roleAssignments.length > 0 
        ? user.roleAssignments[0].hotelId 
        : null;

    const payload = { 
        sub: user.id, 
        email: user.email, 
        roles: user.roles,
        hotelId // Add to payload
    };
    return this.jwtService.sign(payload);
  }
}
