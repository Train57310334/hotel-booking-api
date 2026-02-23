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
exports.FolioController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const folio_service_1 = require("./folio.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let FolioController = class FolioController {
    constructor(svc) {
        this.svc = svc;
    }
    getFolio(bookingId) {
        return this.svc.getFolio(bookingId);
    }
    addCharge(bookingId, body) {
        return this.svc.addCharge(bookingId, body);
    }
    removeCharge(id) {
        return this.svc.removeCharge(id);
    }
};
exports.FolioController = FolioController;
__decorate([
    (0, common_1.Get)(':bookingId'),
    (0, roles_decorator_1.Roles)('admin', 'owner', 'reception'),
    __param(0, (0, common_1.Param)('bookingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FolioController.prototype, "getFolio", null);
__decorate([
    (0, common_1.Post)(':bookingId/charges'),
    (0, roles_decorator_1.Roles)('admin', 'owner', 'reception'),
    __param(0, (0, common_1.Param)('bookingId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FolioController.prototype, "addCharge", null);
__decorate([
    (0, common_1.Delete)('charges/:id'),
    (0, roles_decorator_1.Roles)('admin', 'owner'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FolioController.prototype, "removeCharge", null);
exports.FolioController = FolioController = __decorate([
    (0, swagger_1.ApiTags)('folio'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('folio'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [folio_service_1.FolioService])
], FolioController);
//# sourceMappingURL=folio.controller.js.map