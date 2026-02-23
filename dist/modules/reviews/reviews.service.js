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
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ReviewsService = class ReviewsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        return this.prisma.review.create({
            data: {
                ...data,
                status: 'pending'
            }
        });
    }
    async findAll(status, hotelId) {
        const where = {};
        if (status && status !== 'All') {
            where.status = status.toLowerCase();
        }
        if (hotelId) {
            where.hotelId = hotelId;
        }
        return this.prisma.review.findMany({
            where,
            include: {
                user: { select: { name: true, email: true } },
                hotel: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    async findByHotel(hotelId) {
        return this.prisma.review.findMany({
            where: {
                hotelId,
                status: 'approved'
            },
            include: {
                user: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    async updateStatus(id, status) {
        return this.prisma.review.update({
            where: { id },
            data: { status }
        });
    }
    async delete(id) {
        return this.prisma.review.delete({
            where: { id }
        });
    }
    async getStats(hotelId) {
        const where = {};
        if (hotelId)
            where.hotelId = hotelId;
        const total = await this.prisma.review.count({ where });
        const pending = await this.prisma.review.count({ where: { ...where, status: 'pending' } });
        const approved = await this.prisma.review.count({ where: { ...where, status: 'approved' } });
        const avg = await this.prisma.review.aggregate({
            _avg: { rating: true },
            where: { ...where, status: 'approved' }
        });
        return { total, pending, approved, averageRating: avg._avg.rating || 0 };
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map