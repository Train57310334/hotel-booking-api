import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ROLE_PERMISSIONS } from '../config/role-permissions.config';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
      private reflector: Reflector,
      private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No specific permissions required 
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
        throw new ForbiddenException('User not authenticated');
    }

    // Identify user's global capabilities
    let userPermissions: string[] = [];

    // Platform Admin has all permissions globally
    if (user.roles?.includes('platform_admin')) {
        return true; 
    }

    // Get hotel context to figure out property-level roles
    const hotelId = request.query.hotelId || request.body.hotelId || request.params.hotelId || request.headers['x-hotel-id'];

    if (hotelId) {
        const assignment = user.roleAssignments?.find(a => a.hotelId === hotelId);
        
        if (!assignment) {
             throw new ForbiddenException('Access denied for this property');
        }

        // --- SUSPENSION CHECK ---
        const hotel = await this.prisma.hotel.findUnique({ where: { id: hotelId }, select: { isSuspended: true } });
        if (hotel?.isSuspended && !user.roles?.includes('platform_admin')) {
             throw new ForbiddenException('This property has been suspended by the platform administrator.');
        }

        // Extract permissions based on assigned role
        const roleStr = assignment.role.toLowerCase();
        userPermissions = ROLE_PERMISSIONS[roleStr] || [];

    } else {
        // If no hotel context is provided, checking property-specific permissions is unsafe.
        // We block explicit permission gates without context unless they are platform admins.
        throw new ForbiddenException('Permission verification requires hotel context (hotelId)');
    }

    // The user has the wildcard capability
    if (userPermissions.includes('*')) {
        return true; 
    }

    // Check if the user has AT LEAST ONE of the required permissions (OR logic)
    const hasPermission = requiredPermissions.some(permission => userPermissions.includes(permission));
    
    if (hasPermission) {
        return true;
    }

    throw new ForbiddenException(`Insufficient permissions. Requires one of: ${requiredPermissions.join(', ')}`);
  }
}
