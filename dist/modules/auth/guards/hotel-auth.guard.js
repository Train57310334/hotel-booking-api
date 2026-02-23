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
exports.HotelAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
let HotelAuthGuard = class HotelAuthGuard {
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new common_1.ForbiddenException('User not authenticated');
        }
        if (user.roles?.includes('platform_admin')) {
            return true;
        }
        const hotelId = request.query.hotelId ||
            request.body.hotelId ||
            request.params.hotelId;
        if (hotelId) {
            const hasAccess = user.roleAssignments?.some(assignment => assignment.hotelId === hotelId);
            if (!hasAccess) {
                throw new common_1.ForbiddenException(`You do not have permission to access Hotel ID: ${hotelId}`);
            }
        }
        return true;
    }
};
exports.HotelAuthGuard = HotelAuthGuard;
exports.HotelAuthGuard = HotelAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], HotelAuthGuard);
//# sourceMappingURL=hotel-auth.guard.js.map