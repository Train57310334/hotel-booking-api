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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HousekeepingController = void 0;
const common_1 = require("@nestjs/common");
const housekeeping_service_1 = require("./housekeeping.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
let HousekeepingController = class HousekeepingController {
    constructor(housekeepingService) {
        this.housekeepingService = housekeepingService;
    }
    async getHousekeepingStatus(hotelId) {
        return this.housekeepingService.getHousekeepingStatus(hotelId);
    }
    async updateRoomStatus(roomId, status, note, req) {
        return this.housekeepingService.updateRoomStatus(roomId, status, req.user?.userId, note);
    }
};
exports.HousekeepingController = HousekeepingController;
__decorate([
    (0, common_1.Get)(':hotelId'),
    (0, roles_decorator_1.Roles)('platform_admin', 'owner', 'admin', 'receptionist'),
    __param(0, (0, common_1.Param)('hotelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HousekeepingController.prototype, "getHousekeepingStatus", null);
__decorate([
    (0, common_1.Put)('rooms/:roomId/status'),
    (0, roles_decorator_1.Roles)('platform_admin', 'owner', 'admin', 'receptionist'),
    __param(0, (0, common_1.Param)('roomId')),
    __param(1, (0, common_1.Body)('status')),
    __param(2, (0, common_1.Body)('note')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], HousekeepingController.prototype, "updateRoomStatus", null);
exports.HousekeepingController = HousekeepingController = __decorate([
    (0, common_1.Controller)('housekeeping'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [housekeeping_service_1.HousekeepingService])
], HousekeepingController);
//# sourceMappingURL=housekeeping.controller.js.map