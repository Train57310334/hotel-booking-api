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
exports.RatesController = void 0;
const common_1 = require("@nestjs/common");
const rates_service_1 = require("./rates.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const swagger_1 = require("@nestjs/swagger");
const roles_guard_1 = require("../roles/roles.guard");
const roles_decorator_1 = require("../roles/roles.decorator");
const role_enum_1 = require("../roles/role.enum");
let RatesController = class RatesController {
    constructor(ratesService) {
        this.ratesService = ratesService;
    }
    createPlan(body) {
        return this.ratesService.createRatePlan(body);
    }
    getPlans(hotelId) {
        return this.ratesService.getRatePlans(hotelId);
    }
    updatePlan(id, body) {
        return this.ratesService.updateRatePlan(id, body);
    }
    deletePlan(id) {
        return this.ratesService.deleteRatePlan(id);
    }
    upsertOverride(body) {
        return this.ratesService.upsertOverride(body);
    }
    upsertOverrideBulk(body) {
        return this.ratesService.upsertOverrideBulk(body);
    }
    getOverrides(roomTypeId, start, end) {
        return this.ratesService.getOverrides(roomTypeId, start, end);
    }
};
exports.RatesController = RatesController;
__decorate([
    (0, roles_decorator_1.Roles)(role_enum_1.Role.HotelAdmin, role_enum_1.Role.PlatformAdmin),
    (0, common_1.Post)('plans'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RatesController.prototype, "createPlan", null);
__decorate([
    (0, common_1.Get)('plans'),
    __param(0, (0, common_1.Query)('hotelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RatesController.prototype, "getPlans", null);
__decorate([
    (0, roles_decorator_1.Roles)(role_enum_1.Role.HotelAdmin, role_enum_1.Role.PlatformAdmin),
    (0, common_1.Put)('plans/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RatesController.prototype, "updatePlan", null);
__decorate([
    (0, roles_decorator_1.Roles)(role_enum_1.Role.HotelAdmin, role_enum_1.Role.PlatformAdmin),
    (0, common_1.Delete)('plans/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RatesController.prototype, "deletePlan", null);
__decorate([
    (0, roles_decorator_1.Roles)(role_enum_1.Role.HotelAdmin, role_enum_1.Role.PlatformAdmin),
    (0, common_1.Post)('overrides'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RatesController.prototype, "upsertOverride", null);
__decorate([
    (0, roles_decorator_1.Roles)(role_enum_1.Role.HotelAdmin, role_enum_1.Role.PlatformAdmin),
    (0, common_1.Post)('overrides/bulk'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RatesController.prototype, "upsertOverrideBulk", null);
__decorate([
    (0, common_1.Get)('overrides'),
    __param(0, (0, common_1.Query)('roomTypeId')),
    __param(1, (0, common_1.Query)('start')),
    __param(2, (0, common_1.Query)('end')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], RatesController.prototype, "getOverrides", null);
exports.RatesController = RatesController = __decorate([
    (0, swagger_1.ApiTags)('rates'),
    (0, common_1.Controller)('rates'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [rates_service_1.RatesService])
], RatesController);
//# sourceMappingURL=rates.controller.js.map