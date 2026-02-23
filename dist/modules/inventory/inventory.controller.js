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
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const inventory_service_1 = require("./inventory.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const role_enum_1 = require("../roles/role.enum");
const roles_decorator_1 = require("../roles/roles.decorator");
const roles_guard_1 = require("../roles/roles.guard");
const update_inventory_dto_1 = require("./dto/update-inventory.dto");
let InventoryController = class InventoryController {
    constructor(inventoryService) {
        this.inventoryService = inventoryService;
    }
    async getInventory(roomTypeId, startDate, endDate) {
        return this.inventoryService.getInventoryByRoomType(roomTypeId, startDate, endDate);
    }
    async updateInventory(roomTypeId, date, body) {
        return this.inventoryService.updateInventory(roomTypeId, date, body);
    }
    async updateBulk(body) {
        return this.inventoryService.updateBulk(body.roomTypeId, body.startDate, body.endDate, {
            allotment: body.allotment,
            stopSale: body.stopSale,
            minStay: body.minStay
        });
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, roles_decorator_1.Roles)(role_enum_1.Role.HotelAdmin, role_enum_1.Role.PlatformAdmin),
    (0, common_1.Get)(':roomTypeId'),
    __param(0, (0, common_1.Param)('roomTypeId')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "getInventory", null);
__decorate([
    (0, roles_decorator_1.Roles)(role_enum_1.Role.HotelAdmin, role_enum_1.Role.PlatformAdmin),
    (0, common_1.Patch)(':roomTypeId/:date'),
    __param(0, (0, common_1.Param)('roomTypeId')),
    __param(1, (0, common_1.Param)('date')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_inventory_dto_1.UpdateInventoryDto]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "updateInventory", null);
__decorate([
    (0, roles_decorator_1.Roles)(role_enum_1.Role.HotelAdmin, role_enum_1.Role.PlatformAdmin),
    (0, common_1.Post)('bulk'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "updateBulk", null);
exports.InventoryController = InventoryController = __decorate([
    (0, swagger_1.ApiTags)('inventory'),
    (0, common_1.Controller)('inventory'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map