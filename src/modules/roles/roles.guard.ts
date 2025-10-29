import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { RolesService } from './roles.service';
import { Role } from './role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('User not authenticated');

    const userRoles = await this.rolesService.getRolesByUser(user.id);
    const roles = userRoles.map((r) => r.role);

    const hasRole = roles.some((r) => requiredRoles.includes(r as Role));
    if (!hasRole)
      throw new ForbiddenException('You do not have permission to access this resource');

    return true;
  }
}
