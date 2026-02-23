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
exports.BookingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const bookings_service_1 = require("./bookings.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const hotel_auth_guard_1 = require("../auth/guards/hotel-auth.guard");
const class_validator_1 = require("class-validator");
class CreateBookingDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "hotelId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "roomTypeId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "ratePlanId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "roomId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "checkIn", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "checkOut", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateBookingDto.prototype, "guests", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateBookingDto.prototype, "leadGuest", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "specialRequests", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "paymentStatus", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBookingDto.prototype, "promotionCode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateBookingDto.prototype, "totalAmount", void 0);
let BookingsController = class BookingsController {
    constructor(svc) {
        this.svc = svc;
    }
    async create(req, dto) {
        let userId = null;
        try {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const payload = JSON.parse(jsonPayload);
                userId = payload.userId || payload.sub;
            }
        }
        catch (e) {
            console.warn('Failed to parse token in create:', e);
        }
        try {
            return await this.svc.create({ ...dto, userId });
        }
        catch (e) {
            console.error('Error in BookingsController.create:', e);
            throw e;
        }
    }
    async createPublic(data) {
        try {
            return await this.svc.createPublicBooking(data);
        }
        catch (e) {
            console.error('Error in BookingsController.createPublic:', e);
            throw e;
        }
    }
    async getSuperBookings(query) {
        return this.svc.getAllPlatformBookings(query);
    }
    async get(req, id) {
        const booking = await this.svc.find(id);
        if (booking.userId) {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                throw new common_1.ForbiddenException('This booking belongs to a registered user. Please login.');
            }
            try {
                const token = authHeader.split(' ')[1];
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const payload = JSON.parse(jsonPayload);
                const requestUserId = payload.userId || payload.sub;
                if (booking.userId !== requestUserId) {
                    throw new common_1.ForbiddenException('Unauthorized access to this booking');
                }
            }
            catch (e) {
                throw new common_1.ForbiddenException('Invalid token');
            }
        }
        return booking;
    }
    async getMyBookings(req) {
        const userId = req.user.userId;
        return this.svc.getMyBookings(userId);
    }
    async confirmPayment(bookingId) {
        return this.svc.confirmPayment(bookingId);
    }
    async cancelBooking(req, bookingId) {
        const userId = req.user.userId;
        return this.svc.cancelBooking(bookingId, userId);
    }
    async getCalendarStats(req, hotelId) {
        const now = new Date();
        if (!hotelId)
            throw new common_1.ForbiddenException('Hotel ID is required');
        return this.svc.getCalendarBookings(hotelId, now.getMonth() + 1, now.getFullYear());
    }
    async getCalendarEvents(start, end, hotelId) {
        if (!hotelId)
            throw new common_1.ForbiddenException('Hotel ID is required');
        return this.svc.getCalendarEvents(hotelId, start, end);
    }
    async getDashboardStats(req, period, hotelId) {
        if (!hotelId)
            throw new common_1.ForbiddenException('Hotel ID is required');
        return this.svc.getDashboardStatsNew(hotelId, period);
    }
    async getAllBookings(req, page = 1, limit = 20, hotelId, search, status, order) {
        if (!hotelId)
            throw new common_1.ForbiddenException('Hotel ID is required');
        return this.svc.findAll(hotelId, search, status, 'createdAt', order, page, limit);
    }
    async cancelBookingByAdmin(bookingId, hotelId) {
        if (!hotelId)
            throw new common_1.ForbiddenException('Hotel ID is required');
        return this.svc.cancelBookingByAdmin(bookingId, hotelId);
    }
    async updateStatus(req, id, status, hotelId) {
        if (!hotelId)
            throw new common_1.ForbiddenException('Hotel ID is required');
        const userId = req.user?.userId;
        return this.svc.updateStatus(id, status, hotelId, userId);
    }
    async requestFeedback(id) {
        return this.svc.requestFeedback(id);
    }
    async getInvoice(req, id) {
        return this.svc.generateInvoice(id);
    }
};
exports.BookingsController = BookingsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CreateBookingDto]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('public'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "createPublic", null);
__decorate([
    (0, common_1.Get)('super'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('platform_admin'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getSuperBookings", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "get", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('my-bookings/list'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getMyBookings", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Put)(':id/confirm-payment'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "confirmPayment", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Put)(':id/cancel'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "cancelBooking", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, hotel_auth_guard_1.HotelAuthGuard),
    (0, common_1.Get)('admin/calendar'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('hotelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getCalendarStats", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, hotel_auth_guard_1.HotelAuthGuard),
    (0, common_1.Get)('admin/calendar-events'),
    __param(0, (0, common_1.Query)('start')),
    __param(1, (0, common_1.Query)('end')),
    __param(2, (0, common_1.Query)('hotelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getCalendarEvents", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, hotel_auth_guard_1.HotelAuthGuard),
    (0, common_1.Get)('admin/dashboard'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('period')),
    __param(2, (0, common_1.Query)('hotelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, hotel_auth_guard_1.HotelAuthGuard),
    (0, common_1.Get)('admin/all'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('hotelId')),
    __param(4, (0, common_1.Query)('search')),
    __param(5, (0, common_1.Query)('status')),
    __param(6, (0, common_1.Query)('order')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String, String, String, String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getAllBookings", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, hotel_auth_guard_1.HotelAuthGuard),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    (0, common_1.Put)('admin/:id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('hotelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "cancelBookingByAdmin", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, hotel_auth_guard_1.HotelAuthGuard),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'reception'),
    (0, common_1.Put)('admin/:id/status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('status')),
    __param(3, (0, common_1.Query)('hotelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, hotel_auth_guard_1.HotelAuthGuard),
    (0, common_1.Post)(':id/request-feedback'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "requestFeedback", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':id/invoice'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getInvoice", null);
exports.BookingsController = BookingsController = __decorate([
    (0, swagger_1.ApiTags)('bookings'),
    (0, common_1.Controller)('bookings'),
    __metadata("design:paramtypes", [bookings_service_1.BookingsService])
], BookingsController);
//# sourceMappingURL=bookings.controller.js.map