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
exports.SearchController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const search_service_1 = require("./search.service");
let SearchController = class SearchController {
    constructor(searchService) {
        this.searchService = searchService;
    }
    autocomplete(q) {
        return { q, suggestions: [] };
    }
    async searchHotels(city, checkIn, checkOut, minPrice, maxPrice, guests, adults, children, amenities) {
        const hotels = await this.searchService.findHotelsByCity(city, checkIn, checkOut, minPrice ? Number(minPrice) : undefined, maxPrice ? Number(maxPrice) : undefined, guests ? Number(guests) : undefined, adults ? Number(adults) : undefined, children ? Number(children) : undefined, amenities);
        return hotels;
    }
    async globalSearch(q, hotelId) {
        return this.searchService.globalSearch(q, hotelId);
    }
};
exports.SearchController = SearchController;
__decorate([
    (0, common_1.Get)('autocomplete'),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SearchController.prototype, "autocomplete", null);
__decorate([
    (0, common_1.Get)('hotels'),
    __param(0, (0, common_1.Query)('city')),
    __param(1, (0, common_1.Query)('checkIn')),
    __param(2, (0, common_1.Query)('checkOut')),
    __param(3, (0, common_1.Query)('minPrice')),
    __param(4, (0, common_1.Query)('maxPrice')),
    __param(5, (0, common_1.Query)('guests')),
    __param(6, (0, common_1.Query)('adults')),
    __param(7, (0, common_1.Query)('children')),
    __param(8, (0, common_1.Query)('amenities')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, Array]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "searchHotels", null);
__decorate([
    (0, common_1.Get)('global'),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('hotelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "globalSearch", null);
exports.SearchController = SearchController = __decorate([
    (0, swagger_1.ApiTags)('search'),
    (0, common_1.Controller)('search'),
    __metadata("design:paramtypes", [search_service_1.SearchService])
], SearchController);
//# sourceMappingURL=search.controller.js.map