import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ROLE_PERMISSIONS } from '../config/role-permissions.config';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
      private reflector: Reflector,
      private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
        throw new ForbiddenException('User not authenticated');
    }

    if (user.roles?.includes('platform_admin')) {
        return true;
    }

    const hotelId = request.query.hotelId || request.body.hotelId || request.params.hotelId || request.headers['x-hotel-id'];

    if (hotelId) {
        const assignment = user.roleAssignments?.find(a => a.hotelId === hotelId);
        
        if (!assignment) {
             throw new ForbiddenException('Access denied for this property');
        }

        // ─── Suspension check ────────────────────────────────────────────────
        // Note: RolesGuard (which runs before this guard) already caches this
        // for 60s. When both guards are stacked, this call will likely be a
        // separate query, but PermissionsGuard alone is rarely used without RolesGuard.
        const hotel = await this.prisma.hotel.findUnique({
          where: { id: hotelId },
          select: { isSuspended: true },
        });
        if (hotel?.isSuspended) {
             throw new ForbiddenException('This property has been suspended by the platform administrator.');
        }

        const roleStr = assignment.role.toLowerCase();
        const userPermissions: string[] = ROLE_PERMISSIONS[roleStr] || [];

        if (userPermissions.includes('*')) {
            return true;
        }

        const hasPermission = requiredPermissions.some(permission => userPermissions.includes(permission));
        
        if (hasPermission) {
            return true;
        }

        throw new ForbiddenException(`Insufficient permissions. Requires one of: ${requiredPermissions.join(', ')}`);
    }

    throw new ForbiddenException('Permission verification requires hotel context (hotelId)');
  }
}
