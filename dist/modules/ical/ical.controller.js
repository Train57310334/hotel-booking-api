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
exports.IcalController = void 0;
const common_1 = require("@nestjs/common");
const ical_service_1 = require("./ical.service");
let IcalController = class IcalController {
    constructor(icalService) {
        this.icalService = icalService;
    }
    async exportIcal(hotelId, res) {
        const calendarString = await this.icalService.generateIcal(hotelId);
        res.set({
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': `attachment; filename="hotel-${hotelId}.ics"`,
        });
        res.send(calendarString);
    }
};
exports.IcalController = IcalController;
__decorate([
    (0, common_1.Get)('export/:hotelId'),
    __param(0, (0, common_1.Param)('hotelId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], IcalController.prototype, "exportIcal", null);
exports.IcalController = IcalController = __decorate([
    (0, common_1.Controller)('ical'),
    __metadata("design:paramtypes", [ical_service_1.IcalService])
], IcalController);
//# sourceMappingURL=ical.controller.js.map