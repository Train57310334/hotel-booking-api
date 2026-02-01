import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'change_this_secret_key',
    });
  }

  async validate(payload: any) {
    // Fetch fresh permissions from DB to ensure security
    const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { roleAssignments: true }
    });
    
    // Fallback if user deleted
    if (!user) return null;

    const hotelId = user.roleAssignments && user.roleAssignments.length > 0 
        ? user.roleAssignments[0].hotelId 
        : null;

    return { 
        userId: user.id, 
        email: user.email, 
        roles: user.roles,
        hotelId, // Critical for Multi-Tenancy
        roleAssignments: user.roleAssignments
    };
  }
} 
