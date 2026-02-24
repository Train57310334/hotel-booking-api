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
exports.JwtStrategy = void 0;
exports.invalidateUserCache = invalidateUserCache;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const userCache = new Map();
const USER_CACHE_TTL_MS = 5 * 60 * 1000;
function invalidateUserCache(userId) {
    userCache.delete(userId);
}
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    constructor(prisma) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'change_this_secret_key',
        });
        this.prisma = prisma;
    }
    async validate(payload) {
        const userId = payload.sub;
        const now = Date.now();
        const cached = userCache.get(userId);
        if (cached && now < cached.expiresAt) {
            return {
                userId: cached.userId,
                email: cached.email,
                roles: cached.roles,
                hotelId: cached.hotelId,
                roleAssignments: cached.roleAssignments,
            };
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { roleAssignments: true },
        });
        if (!user) {
            userCache.delete(userId);
            return null;
        }
        const hotelId = user.roleAssignments && user.roleAssignments.length > 0
            ? user.roleAssignments[0].hotelId
            : null;
        const freshUser = {
            userId: user.id,
            email: user.email,
            roles: user.roles,
            hotelId,
            roleAssignments: user.roleAssignments,
            expiresAt: now + USER_CACHE_TTL_MS,
        };
        userCache.set(userId, freshUser);
        return {
            userId: freshUser.userId,
            email: freshUser.email,
            roles: freshUser.roles,
            hotelId: freshUser.hotelId,
            roleAssignments: freshUser.roleAssignments,
        };
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map