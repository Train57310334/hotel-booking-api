import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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

    // Check specific hotel assignment roles
    // We assume the context knows which hotel we are targeting, OR we check if *any* assignment matches.
    // However, usually API calls are contextual to a hotel.
    
    // Strategy: Look for hotelId in request, match assignment for that hotel.
    const hotelId = request.query.hotelId || request.body.hotelId || request.params.hotelId || request.headers['x-hotel-id'];

    if (hotelId) {
        const assignment = user.roleAssignments?.find(a => a.hotelId === hotelId);
        if (!assignment) {
            // User not assigned to this hotel at all
             throw new ForbiddenException('Access denied for this hotel');
        }
        
        // Check if the assigned role is sufficient
        // Hierarchy: owner > admin > manager > reception
        // But for simplicity, let's just use exact string matching or inclusion
        
        // Logic: specific role required.
        // If required = ['owner'], user must have 'owner'.
        // If required = ['owner', 'admin'], user must have 'owner' OR 'admin'.
        
        // Normalized user role from DB is typically lowercase 'owner', 'reception', 'admin'
        const userRole = assignment.role.toLowerCase();
        
        if (requiredRoles.includes(userRole)) {
            return true;
        } else {
             // Handle Hierarchy implication? 
             // E.g. Owner implies Admin implies Reception?
             // Let's implement simple hierarchy mapping
             const hierarchy = {
                 'owner': 100,
                 'admin': 90,
                 'manager': 80,
                 'reception': 10
             };
             
             const userLevel = hierarchy[userRole] || 0;
             const hasSufficientLevel = requiredRoles.some(req => (hierarchy[req] || 0) <= userLevel);
             
             if (hasSufficientLevel) return true;
             
             throw new ForbiddenException(`Insufficient permissions. Required: ${requiredRoles.join(', ')}`);
        }
    }

    // If no hotelId found, we might be listing all hotels? 
    // In that case, we might check if user has *any* assignment with that role?
    // For safety, let's block if context is ambiguous
    // If no hotelId found, we cannot verify permission for specific hotel resources
    // If roles are required, this context MUST be provided
    throw new ForbiddenException('Role verification requires hotel context (hotelId)'); 
  }
}
