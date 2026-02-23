"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomTypesModule = void 0;
const common_1 = require("@nestjs/common");
const room_types_service_1 = require("./room-types.service");
const room_types_controller_1 = require("./room-types.controller");
let RoomTypesModule = class RoomTypesModule {
};
exports.RoomTypesModule = RoomTypesModule;
exports.RoomTypesModule = RoomTypesModule = __decorate([
    (0, common_1.Module)({
        providers: [room_types_service_1.RoomTypesService],
        controllers: [room_types_controller_1.RoomTypesController],
        exports: [room_types_service_1.RoomTypesService]
    })
], RoomTypesModule);
//# sourceMappingURL=room-types.module.js.map