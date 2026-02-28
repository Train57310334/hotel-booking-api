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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const bcrypt = __importStar(require("bcryptjs"));
const jwt_strategy_1 = require("./jwt.strategy");
let AuthService = class AuthService {
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async register(data) {
        const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
        if (existing)
            throw new common_1.ConflictException('Email already registered');
        const hashed = await bcrypt.hash(data.password, 10);
        const user = await this.prisma.user.create({
            data: {
                email: data.email,
                passwordHash: hashed,
                name: data.name,
                phone: data.phone,
                roles: ['user'],
            },
        });
        const token = this.generateToken(user);
        return { user, token };
    }
    async registerPartner(data) {
        const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
        if (existing)
            throw new common_1.ConflictException('Email already registered');
        const hashed = await bcrypt.hash(data.password, 10);
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: data.email,
                    passwordHash: hashed,
                    name: data.name,
                    phone: data.phone,
                    roles: ['user', 'hotel_admin'],
                }
            });
            const pkg = data.package || 'LITE';
            const plan = await tx.subscriptionPlan.findUnique({ where: { id: pkg } });
            const limits = plan ? {
                maxRooms: plan.maxRooms,
                maxRoomTypes: plan.maxRoomTypes,
                maxStaff: plan.maxStaff,
                hasPromotions: plan.hasPromotions,
                hasOnlinePayment: plan.hasOnlinePayment,
            } : {
                maxRooms: 5,
                maxRoomTypes: 2,
                maxStaff: 1,
                hasPromotions: false,
                hasOnlinePayment: false,
            };
            const hotel = await tx.hotel.create({
                data: {
                    name: data.hotelName,
                    ownerId: user.id,
                    package: pkg,
                    ...limits
                }
            });
            await tx.roleAssignment.create({
                data: {
                    userId: user.id,
                    hotelId: hotel.id,
                    role: 'owner'
                }
            });
            const userWithRole = {
                ...user,
                roleAssignments: [{ hotelId: hotel.id }]
            };
            const token = this.generateToken(userWithRole);
            return { user, hotel, token };
        });
    }
    async login(data) {
        const user = await this.prisma.user.findUnique({
            where: { email: data.email },
            include: { roleAssignments: true }
        });
        if (!user)
            throw new common_1.UnauthorizedException('Invalid email or password');
        const valid = await bcrypt.compare(data.password, user.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid email or password');
        const token = this.generateToken(user);
        return { user, token };
    }
    async getProfile(userId) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                avatarUrl: true,
                roles: true,
                roleAssignments: {
                    include: { hotel: true }
                }
            },
        });
    }
    async impersonate(targetHotelId) {
        const hotel = await this.prisma.hotel.findUnique({
            where: { id: targetHotelId },
            include: { owner: true }
        });
        if (!hotel || !hotel.owner) {
            throw new common_1.UnauthorizedException('Target hotel or owner not found');
        }
        const targetUser = await this.prisma.user.findUnique({
            where: { id: hotel.owner.id },
            include: { roleAssignments: true }
        });
        if (!targetUser) {
            throw new common_1.UnauthorizedException('Target user not found');
        }
        const token = this.generateToken(targetUser, targetHotelId);
        (0, jwt_strategy_1.invalidateUserCache)(targetUser.id);
        return { user: targetUser, token, isImpersonating: true };
    }
    generateToken(user, forceHotelId) {
        const hotelId = forceHotelId || (user.roleAssignments && user.roleAssignments.length > 0
            ? user.roleAssignments[0].hotelId
            : null);
        const payload = {
            sub: user.id,
            email: user.email,
            roles: user.roles,
            hotelId,
            isImpersonating: !!forceHotelId
        };
        return this.jwtService.sign(payload);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map