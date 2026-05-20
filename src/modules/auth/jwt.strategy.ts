import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

// ─── Cache Configuration ──────────────────────────────────────────────────────
const USER_CACHE_TTL_S = 5 * 60; // 5 minutes (Redis uses seconds)
const USER_CACHE_TTL_MS = USER_CACHE_TTL_S * 1000;
const REDIS_KEY_PREFIX = 'jwt:user:';

// ─── In-Memory Fallback (single-process, used when Redis is unavailable) ──────
// In a multi-instance deployment, each instance has its own cache — which means
// role changes may not propagate instantly across instances. The TTL (5 min) is
// an acceptable security tradeoff for a hotel management system.
// When Redis IS available, all instances share the same cache automatically.
interface CachedUser {
  userId: string;
  email: string;
  roles: string[];
  hotelId: string | null;
  isImpersonating: boolean;
  roleAssignments: any[];
  expiresAt: number; // epoch ms — only used for in-memory fallback
}

const memoryCache = new Map<string, CachedUser>();

/**
 * Force-invalidate a specific user's cache entry from the in-memory fallback.
 * Call this from business logic that changes roles/assignments.
 * Note: Redis entries use TTL and are invalidated by RedisService.del() instead.
 */
export function invalidateUserCache(userId: string): void {
  memoryCache.delete(userId);
  memoryCache.delete(`${userId}-imp-*`); // best-effort; impersonation keys
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // SECURITY: No fallback — main.ts validates JWT_SECRET on startup
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const userId: string = payload.sub;
    const isImpersonating: boolean = !!payload.isImpersonating;
    const impersonatedHotelId: string | null = payload.hotelId;
    const cacheKey = isImpersonating ? `${userId}-imp-${impersonatedHotelId}` : userId;
    const now = Date.now();

    // ── 1. Try Redis Cache (distributed, survives restarts & multi-instance) ──
    const redisKey = `${REDIS_KEY_PREFIX}${cacheKey}`;
    const redisHit = await this.redis.get(redisKey);
    if (redisHit) {
      try {
        const cached = JSON.parse(redisHit) as CachedUser;
        return this.toUserPayload(cached);
      } catch {
        // Corrupted cache entry — fall through to DB
        await this.redis.del(redisKey);
      }
    }

    // ── 2. Try In-Memory Fallback Cache (when Redis unavailable) ──────────────
    if (!this.redis.available) {
      const memHit = memoryCache.get(cacheKey);
      if (memHit && now < memHit.expiresAt) {
        return this.toUserPayload(memHit);
      }
    }

    // ── 3. Cache Miss → DB Query ──────────────────────────────────────────────
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roleAssignments: true },
    });

    if (!user) {
      // User deleted — evict stale cache everywhere
      await this.redis.del(redisKey);
      memoryCache.delete(cacheKey);
      return null;
    }

    const isPlatformAdmin = user.roles?.includes('platform_admin');
    const hotelId = isImpersonating
      ? impersonatedHotelId
      : isPlatformAdmin
        ? null
        : user.roleAssignments?.[0]?.hotelId ?? null;

    let roles = [...user.roles];
    if (isImpersonating && !roles.includes('owner')) {
      roles.push('owner');
    }

    const freshUser: CachedUser = {
      userId: user.id,
      email: user.email,
      roles,
      hotelId,
      isImpersonating,
      roleAssignments: user.roleAssignments,
      expiresAt: now + USER_CACHE_TTL_MS,
    };

    // ── 4. Store in Redis (preferred) or in-memory fallback ───────────────────
    if (this.redis.available) {
      await this.redis.set(redisKey, JSON.stringify(freshUser), USER_CACHE_TTL_S);
    } else {
      memoryCache.set(cacheKey, freshUser);
    }

    return this.toUserPayload(freshUser);
  }

  private toUserPayload(user: CachedUser) {
    return {
      userId: user.userId,
      email: user.email,
      roles: user.roles,
      hotelId: user.hotelId,
      isImpersonating: user.isImpersonating,
      roleAssignments: user.roleAssignments,
    };
  }

  /**
   * Invalidate a user's cache in both Redis and local memory.
   * Use this when user roles or hotel assignments change.
   */
  async invalidate(userId: string, impersonatedHotelId?: string): Promise<void> {
    const keys = [
      `${REDIS_KEY_PREFIX}${userId}`,
      ...(impersonatedHotelId ? [`${REDIS_KEY_PREFIX}${userId}-imp-${impersonatedHotelId}`] : []),
    ];
    await this.redis.del(...keys);
    memoryCache.delete(userId);
    if (impersonatedHotelId) memoryCache.delete(`${userId}-imp-${impersonatedHotelId}`);
  }
}
