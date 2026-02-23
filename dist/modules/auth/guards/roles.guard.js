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
exports.RolesGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const roles_decorator_1 = require("../decorators/roles.decorator");
const prisma_service_1 = require("../../../common/prisma/prisma.service");
let RolesGuard = class RolesGuard {
    constructor(reflector, prisma) {
        this.reflector = reflector;
        this.prisma = prisma;
    }
    async canActivate(context) {
        const requiredRoles = this.reflector.getAllAndOverride(roles_decorator_1.ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new common_1.ForbiddenException('User not authenticated');
        }
        if (user.roles?.includes('platform_admin'))
            return true;
        const hotelId = request.query.hotelId || request.body.hotelId || request.params.hotelId || request.headers['x-hotel-id'];
        if (hotelId) {
            const assignment = user.roleAssignments?.find(a => a.hotelId === hotelId);
            if (!assignment) {
                throw new common_1.ForbiddenException('Access denied for this hotel');
            }
            const hotel = await this.prisma.hotel.findUnique({ where: { id: hotelId }, select: { isSuspended: true } });
            if (hotel?.isSuspended && !user.roles?.includes('platform_admin')) {
                throw new common_1.ForbiddenException('This property has been suspended by the platform administrator.');
            }
            const userRole = assignment.role.toLowerCase();
            if (requiredRoles.includes(userRole)) {
                return true;
            }
            else {
                const hierarchy = {
                    'owner': 100,
                    'admin': 90,
                    'manager': 80,
                    'reception': 10
                };
                const userLevel = hierarchy[userRole] || 0;
                const hasSufficientLevel = requiredRoles.some(req => (hierarchy[req] || 0) <= userLevel);
                if (hasSufficientLevel)
                    return true;
                throw new common_1.ForbiddenException(`Insufficient permissions. Required: ${requiredRoles.join(', ')}`);
            }
        }
        throw new common_1.ForbiddenException('Role verification requires hotel context (hotelId)');
    }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        prisma_service_1.PrismaService])
], RolesGuard);
//# sourceMappingURL=roles.guard.js.map