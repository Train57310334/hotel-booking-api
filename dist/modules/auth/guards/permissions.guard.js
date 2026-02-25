"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionsGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const permissions_decorator_1 = require("../decorators/permissions.decorator");
const prisma_service_1 = require("../../../common/prisma/prisma.service");
const role_permissions_config_1 = require("../config/role-permissions.config");
let PermissionsGuard = class PermissionsGuard {
    constructor(reflector, prisma) {
        this.reflector = reflector;
        this.prisma = prisma;
    }
    async canActivate(context) {
        const requiredPermissions = this.reflector.getAllAndOverride(permissions_decorator_1.PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new common_1.ForbiddenException('User not authenticated');
        }
        let userPermissions = [];
        if (user.roles?.includes('platform_admin')) {
            return true;
        }
        const hotelId = request.query.hotelId || request.body.hotelId || request.params.hotelId || request.headers['x-hotel-id'];
        if (hotelId) {
            const assignment = user.roleAssignments?.find(a => a.hotelId === hotelId);
            if (!assignment) {
                throw new common_1.ForbiddenException('Access denied for this property');
            }
            const hotel = await this.prisma.hotel.findUnique({ where: { id: hotelId }, select: { isSuspended: true } });
            if (hotel?.isSuspended && !user.roles?.includes('platform_admin')) {
                throw new common_1.ForbiddenException('This property has been suspended by the platform administrator.');
            }
            const roleStr = assignment.role.toLowerCase();
            userPermissions = role_permissions_config_1.ROLE_PERMISSIONS[roleStr] || [];
        }
        else {
            throw new common_1.ForbiddenException('Permission verification requires hotel context (hotelId)');
        }
        if (userPermissions.includes('*')) {
            return true;
        }
        const hasPermission = requiredPermissions.some(permission => userPermissions.includes(permission));
        if (hasPermission) {
            return true;
        }
        throw new common_1.ForbiddenException(`Insufficient permissions. Requires one of: ${requiredPermissions.join(', ')}`);
    }
};
exports.PermissionsGuard = PermissionsGuard;
exports.PermissionsGuard = PermissionsGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        prisma_service_1.PrismaService])
], PermissionsGuard);
//# sourceMappingURL=permissions.guard.js.map