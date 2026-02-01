import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class HotelAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Platform Admin bypass
    if (user.roles?.includes('platform_admin')) {
      return true;
    }

    // Extract hotelId from various sources
    const hotelId = 
      request.query.hotelId || 
      request.body.hotelId || 
      request.params.hotelId;

    // If no hotelId is requested, we might restrict access or allow if it's a general "my profile" call.
    // But for "Bookings" endpoints, we usually need it.
    // If the controller didn't ask for it, maybe this guard shouldn't be here? 
    // Or we strictly enforce "If you ask for hotel data, you must own it".
    
    if (hotelId) {
        const hasAccess = user.roleAssignments?.some(assignment => assignment.hotelId === hotelId);
        if (!hasAccess) {
            throw new ForbiddenException(`You do not have permission to access Hotel ID: ${hotelId}`);
        }
    }

    return true;
  }
}
