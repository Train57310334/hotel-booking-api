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
exports.RolesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let RolesService = class RolesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async assignRole(userId, role, hotelId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const validRoles = ['user', 'hotel_admin', 'platform_admin'];
        if (!validRoles.includes(role))
            throw new common_1.BadRequestException(`Invalid role: ${role}`);
        if (role === 'hotel_admin' && !hotelId)
            throw new common_1.BadRequestException('hotelId is required for hotel_admin role');
        const existing = await this.prisma.roleAssignment.findFirst({
            where: { userId, role, hotelId },
        });
        if (existing)
            return existing;
        return this.prisma.roleAssignment.create({
            data: { userId, role, hotelId: hotelId ?? null },
        });
    }
    async getRolesByUser(userId) {
        return this.prisma.roleAssignment.findMany({
            where: { userId },
            include: {
                hotel: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async revokeRole(id) {
        const role = await this.prisma.roleAssignment.findUnique({ where: { id } });
        if (!role)
            throw new common_1.NotFoundException('Role assignment not found');
        return this.prisma.roleAssignment.delete({ where: { id } });
    }
    async listHotelAdmins() {
        return this.prisma.roleAssignment.findMany({
            where: { role: 'hotel_admin' },
            include: {
                user: { select: { id: true, email: true, name: true } },
                hotel: { select: { id: true, name: true } },
            },
        });
    }
};
exports.RolesService = RolesService;
exports.RolesService = RolesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RolesService);
//# sourceMappingURL=roles.service.js.map