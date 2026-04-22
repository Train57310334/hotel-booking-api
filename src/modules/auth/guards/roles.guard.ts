import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PrismaService } from '../../../common/prisma/prisma.service';

// ─── Hotel Suspension Cache ──────────────────────────────────────────────────
// Avoids a DB round-trip on EVERY authenticated request just to check isSuspended.
// TTL: 60 seconds — short enough to reflect admin actions quickly, 
//                    long enough to prevent DB hammering under load.
const SUSPENSION_CACHE_TTL_MS = 60_000;

interface CacheEntry {
  isSuspended: boolean;
  expiresAt: number;
}

@Injectable()
export class RolesGuard implements CanActivate {
  // Shared across all requests within the same process instance.
  // Acceptable trade-off: each horizontal instance has its own cache (max 60s drift).
  private readonly hotelSuspensionCache = new Map<string, CacheEntry>();

  constructor(
      private reflector: Reflector,
      private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No roles required, proceed (or rely on other guards)
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
        throw new ForbiddenException('User not authenticated');
    }

    // Platform Admin bypass
    if (user.roles?.includes('platform_admin')) return true;

    // Strategy: Look for hotelId in request, match assignment for that hotel.
    const hotelId = request.query.hotelId || request.body.hotelId || request.params.hotelId || request.headers['x-hotel-id'];

    if (hotelId) {
        const assignment = user.roleAssignments?.find(a => a.hotelId === hotelId);
        if (!assignment) {
             throw new ForbiddenException('Access denied for this hotel');
        }
        
        // ─── Suspension check with TTL cache ─────────────────────────────
        const isSuspended = await this.isHotelSuspended(hotelId);
        if (isSuspended) {
             throw new ForbiddenException('This property has been suspended by the platform administrator.');
        }

        // Role hierarchy: owner > admin > manager > reception
        const userRole = assignment.role.toLowerCase();
        if (requiredRoles.includes(userRole)) {
            return true;
        }

        const hierarchy: Record<string, number> = {
            'owner': 100,
            'admin': 90,
            'manager': 80,
            'reception': 10,
        };
        
        const userLevel = hierarchy[userRole] || 0;
        const hasSufficientLevel = requiredRoles.some(req => (hierarchy[req] || 0) <= userLevel);
        
        if (hasSufficientLevel) return true;
        
        throw new ForbiddenException(`Insufficient permissions. Required: ${requiredRoles.join(', ')}`);
    }

    // No hotelId → cannot verify hotel-scoped permission
    throw new ForbiddenException('Role verification requires hotel context (hotelId)'); 
  }

  /**
   * Returns the suspension status of a hotel, using a 60-second TTL cache
   * to avoid hitting the database on every authenticated request.
   */
  private async isHotelSuspended(hotelId: string): Promise<boolean> {
    const now = Date.now();
    const cached = this.hotelSuspensionCache.get(hotelId);

    if (cached && now < cached.expiresAt) {
      return cached.isSuspended;
    }

    // Cache miss or expired — fetch from DB
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { isSuspended: true },
    });
    
    const isSuspended = hotel?.isSuspended ?? false;

    this.hotelSuspensionCache.set(hotelId, {
      isSuspended,
      expiresAt: now + SUSPENSION_CACHE_TTL_MS,
    });

    return isSuspended;
  }

  /**
   * Called by an admin action (suspend/unsuspend hotel) to immediately
   * invalidate the cache entry so the next request hits the DB fresh.
   */
  invalidateSuspensionCache(hotelId: string): void {
    this.hotelSuspensionCache.delete(hotelId);
  }
}
