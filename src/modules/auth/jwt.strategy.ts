import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma/prisma.service';

// ─── In-Memory User Profile Cache ────────────────────────────────────────────
// Caches DB lookup results from JWT validation to reduce DB load.
// Each cache entry lives for USER_CACHE_TTL_MS (5 minutes).
// Cache is invalidated automatically on expiry — no manual bust needed for
// role changes since JWTs themselves expire (typically 1h), and the 5-min
// window is an acceptable security tradeoff for a hotel management system.
// ─────────────────────────────────────────────────────────────────────────────
interface CachedUser {
  userId: string;
  email: string;
  roles: string[];
  hotelId: string | null;
  roleAssignments: any[];
  expiresAt: number; // epoch ms
}

const userCache = new Map<string, CachedUser>();
const USER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Force-invalidate a specific user's cache entry.
 * Call this whenever a user's roles or hotel assignments change
 * (e.g. staff add/remove, suspension, role update, impersonation).
 */
export function invalidateUserCache(userId: string): void {
  userCache.delete(userId);
}

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
    const userId: string = payload.sub;
    const isImpersonating: boolean = !!payload.isImpersonating;
    const impersonatedHotelId: string | null = payload.hotelId;
    const now = Date.now();

    // ── 1. Cache Hit ──────────────────────────────────────────────────────────
    const cacheKey = isImpersonating ? `${userId}-imp-${impersonatedHotelId}` : userId;
    const cached = userCache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      return {
        userId: cached.userId,
        email: cached.email,
        roles: cached.roles,
        hotelId: cached.hotelId,
        roleAssignments: cached.roleAssignments,
      };
    }

    // ── 2. Cache Miss → DB Query ──────────────────────────────────────────────
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roleAssignments: true },
    });

    // User was deleted — remove stale cache and reject
    if (!user) {
      userCache.delete(userId);
      return null;
    }

    const hotelId = isImpersonating
      ? impersonatedHotelId
      : (user.roleAssignments && user.roleAssignments.length > 0
          ? user.roleAssignments[0].hotelId
          : null);

    let roles = user.roles;
    if (isImpersonating) {
       // Hide platform_admin so the frontend correctly loads the hotel dashboard
       roles = roles.filter(r => r !== 'platform_admin');
       if (!roles.includes('hotel_admin')) {
           roles.push('hotel_admin');
       }
    }

    const freshUser: CachedUser = {
      userId: user.id,
      email: user.email,
      roles,
      hotelId,
      roleAssignments: user.roleAssignments,
      expiresAt: now + USER_CACHE_TTL_MS,
    };

    // ── 3. Store in cache ─────────────────────────────────────────────────────
    userCache.set(cacheKey, freshUser);

    return {
      userId: freshUser.userId,
      email: freshUser.email,
      roles: freshUser.roles,
      hotelId: freshUser.hotelId,
      roleAssignments: freshUser.roleAssignments,
    };
  }
}
