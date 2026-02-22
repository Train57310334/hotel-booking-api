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

  // ✅ Register Partner (Owner + Hotel)
  async registerPartner(data: { 
    hotelName: string; 
    email: string; 
    password: string; 
    name: string; 
    phone?: string;
    package?: string; 
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(data.password, 10);

    // Transaction: User -> Hotel -> Assignment
    return this.prisma.$transaction(async (tx) => {
        // 1. Create User
        const user = await tx.user.create({
            data: {
                email: data.email,
                passwordHash: hashed,
                name: data.name,
                phone: data.phone,
                roles: ['user', 'hotel_admin'], // Owner gets admin role
            }
        });

        const pkg = data.package || 'LITE';
        const plan = await tx.subscriptionPlan.findUnique({ where: { id: pkg } });
        
        const limits = plan ? {
          maxRooms: plan.maxRooms,
          maxRoomTypes: plan.maxRoomTypes,
          maxStaff: plan.maxStaff,
          hasPromotions: plan.hasPromotions,
          hasOnlinePayment: plan.hasOnlinePayment,
        } : {
          maxRooms: 5,
          maxRoomTypes: 2,
          maxStaff: 1,
          hasPromotions: false,
          hasOnlinePayment: false,
        };

        // 2. Create Hotel
        const hotel = await tx.hotel.create({
            data: {
                name: data.hotelName,
                ownerId: user.id,
                package: pkg,
                ...limits
            }
        });

        // 3. Assign Role linked to Hotel
        await tx.roleAssignment.create({
            data: {
                userId: user.id,
                hotelId: hotel.id,
                role: 'owner'
            }
        });

        // 4. Generate Token (with new hotel context)
        // We need to fetch the user again or manually construct the payload object carefully
        // But since generateToken relies on roleAssignments in the object, let's just construct payload manually or mock the object
        // Better: Construct object compatible with generateToken
        const userWithRole = {
            ...user,
            roleAssignments: [{ hotelId: hotel.id }]
        };

        const token = this.generateToken(userWithRole);
        return { user, hotel, token };
    });
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
        avatarUrl: true, // Included
        roles: true,
        roleAssignments: {
            include: { hotel: true }
        }
      },
    });
  }

  // ✅ Impersonate (For Super Admins)
  async impersonate(targetHotelId: string) {
    // 1. Find the owner of this hotel
    const hotel = await this.prisma.hotel.findUnique({
        where: { id: targetHotelId },
        include: { owner: true }
    });

    if (!hotel || !hotel.owner) {
        throw new UnauthorizedException('Target hotel or owner not found');
    }

    const targetUser = await this.prisma.user.findUnique({
        where: { id: hotel.owner.id },
        include: { roleAssignments: true }
    });

    if (!targetUser) {
        throw new UnauthorizedException('Target user not found');
    }

    // 2. Generate a token AS IF they just logged in
    const token = this.generateToken(targetUser, targetHotelId);
    return { user: targetUser, token, isImpersonating: true };
  }

  // ✅ Helper: JWT Token
  private generateToken(user: any, forceHotelId?: string) {
    // Find first hotelId from assignments if available, unless forced
    const hotelId = forceHotelId || (user.roleAssignments && user.roleAssignments.length > 0 
        ? user.roleAssignments[0].hotelId 
        : null);

    const payload = { 
        sub: user.id, 
        email: user.email, 
        roles: user.roles,
        hotelId // Add to payload
    };
    return this.jwtService.sign(payload);
  }
}
