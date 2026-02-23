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
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const notifications_service_1 = require("./notifications.service");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let NotificationsController = class NotificationsController {
    constructor(notificationsService, prisma) {
        this.notificationsService = notificationsService;
        this.prisma = prisma;
    }
    async getNotifications(req) {
        const user = req.user;
        const isSuperAdmin = user.roles && user.roles.includes('platform_admin');
        const data = await this.prisma.notification.findMany({
            where: isSuperAdmin
                ? { OR: [{ userId: null }, { userId: user.id }] }
                : { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        return data.map(n => ({
            ...n,
            time: this.timeAgo(n.createdAt)
        }));
    }
    async triggerTest() {
        await this.notificationsService.createNotification('Test Notification', 'This is a test notification from the admin panel.', 'info');
        return { success: true };
    }
    timeAgo(date) {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1)
            return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1)
            return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1)
            return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1)
            return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1)
            return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    }
    async markAsRead(id) {
        return this.prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });
    }
    async markAllAsRead(req) {
        const user = req.user;
        const isSuperAdmin = user.roles && user.roles.includes('platform_admin');
        return this.prisma.notification.updateMany({
            where: isSuperAdmin
                ? { isRead: false, OR: [{ userId: null }, { userId: user.id }] }
                : { isRead: false, userId: user.id },
            data: { isRead: true }
        });
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Get)('test'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "triggerTest", null);
__decorate([
    (0, common_1.Put)(':id/read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Put)('read-all'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markAllAsRead", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, common_1.Controller)('notifications'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService,
        prisma_service_1.PrismaService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map