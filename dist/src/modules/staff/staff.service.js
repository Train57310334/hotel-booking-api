"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const bcrypt = __importStar(require("bcryptjs"));
let StaffService = class StaffService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(hotelId) {
        return this.prisma.user.findMany({
            where: {
                roleAssignments: {
                    some: { hotelId }
                }
            },
            include: {
                roleAssignments: {
                    where: { hotelId }
                }
            }
        }).then(users => users.map(u => ({
            ...u,
            role: u.roleAssignments[0]?.role || 'unknown'
        })));
    }
    async create(hotelId, data) {
        const hotel = await this.prisma.hotel.findUnique({
            where: { id: hotelId },
            select: { maxStaff: true, _count: { select: { RoleAssignment: true } } }
        });
        if (!hotel) {
            throw new common_1.NotFoundException('Hotel not found');
        }
        const currentStaffCount = hotel._count?.RoleAssignment || 0;
        if (currentStaffCount >= hotel.maxStaff) {
            throw new common_1.BadRequestException(`Your plan is limited to ${hotel.maxStaff} staff member(s). Please upgrade your plan to add more staff.`);
        }
        let user = await this.prisma.user.findUnique({ where: { email: data.email } });
        if (!user) {
            const hashedPassword = await bcrypt.hash(data.password || '123456', 10);
            user = await this.prisma.user.create({
                data: {
                    email: data.email,
                    name: data.name,
                    passwordHash: hashedPassword,
                    phone: data.phone
                }
            });
        }
        const existingAssignment = await this.prisma.roleAssignment.findFirst({
            where: { userId: user.id, hotelId }
        });
        if (existingAssignment) {
            throw new common_1.BadRequestException('User is already staff at this hotel.');
        }
        if (data.role === 'owner') {
            throw new common_1.BadRequestException('Cannot assign owner role via this endpoint.');
        }
        await this.prisma.roleAssignment.create({
            data: {
                userId: user.id,
                hotelId,
                role: data.role
            }
        });
        return user;
    }
    async updateRole(hotelId, userId, role) {
        const assignment = await this.prisma.roleAssignment.findFirst({
            where: { userId, hotelId }
        });
        if (!assignment)
            throw new common_1.NotFoundException('Staff not found');
        if (assignment.role === 'owner')
            throw new common_1.BadRequestException('Cannot modify the role of the hotel owner.');
        if (role === 'owner')
            throw new common_1.BadRequestException('Cannot assign the owner role.');
        return this.prisma.roleAssignment.update({
            where: { id: assignment.id },
            data: { role }
        });
    }
    async remove(hotelId, userId) {
        const assignment = await this.prisma.roleAssignment.findFirst({
            where: { userId, hotelId }
        });
        if (!assignment)
            throw new common_1.NotFoundException('Staff not found');
        if (assignment.role === 'owner')
            throw new common_1.BadRequestException('Cannot remove the hotel owner.');
        return this.prisma.roleAssignment.delete({
            where: { id: assignment.id }
        });
    }
};
exports.StaffService = StaffService;
exports.StaffService = StaffService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StaffService);
//# sourceMappingURL=staff.service.js.map