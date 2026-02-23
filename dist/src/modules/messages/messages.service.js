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
exports.MessagesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
let MessagesService = class MessagesService {
    constructor(prisma, notificationsService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
    }
    async findAll(search, hotelId) {
        const where = {};
        if (hotelId)
            where.hotelId = hotelId;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { subject: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } },
            ];
        }
        return this.prisma.message.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { hotel: true }
        });
    }
    async findOne(id) {
        const msg = await this.prisma.message.findUnique({ where: { id } });
        if (!msg)
            throw new common_1.NotFoundException('Message not found');
        return msg;
    }
    async create(data) {
        const msg = await this.prisma.message.create({ data });
        await this.notificationsService.createNotification('New Support Inquiry', `You received a new message from ${data.name} regarding "${data.subject || 'General Inquiry'}".`, 'info');
        return msg;
    }
    async markAsRead(id) {
        return this.prisma.message.update({
            where: { id },
            data: { status: 'read' },
        });
    }
    async reply(id, replyContent) {
        return this.prisma.message.update({
            where: { id },
            data: { status: 'replied' },
        });
    }
    async archive(id) {
        return this.prisma.message.update({
            where: { id },
            data: { status: 'archived' }
        });
    }
    async delete(id) {
        return this.prisma.message.delete({
            where: { id }
        });
    }
};
exports.MessagesService = MessagesService;
exports.MessagesService = MessagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], MessagesService);
//# sourceMappingURL=messages.service.js.map