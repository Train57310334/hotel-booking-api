import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { Role } from './role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // ถ้า route นี้ไม่ได้กำหนด role → ให้ผ่านได้เลย
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // ใช้ roles array ที่อยู่ใน JWT
    const userRoles = user.roles; // Changed from user.role to user.roles
    if (!userRoles || !Array.isArray(userRoles) || userRoles.length === 0) {
       // Support legacy or single role if needed, or throw
       if (user.role) {
           if (requiredRoles.includes(user.role as Role)) return true;
       }
       throw new ForbiddenException('User has no roles');
    }

    // ตรวจว่า user.roles มีอย่างน้อยหนึ่ง role ที่ตรงกับ requiredRoles
    const hasRole = userRoles.some((r: string) => requiredRoles.includes(r as Role));
    
    if (!hasRole) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return true;
  }
}
