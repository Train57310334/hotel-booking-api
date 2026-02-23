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
exports.PromotionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let PromotionsService = class PromotionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        if (data.hotelId) {
            const hotel = await this.prisma.hotel.findUnique({
                where: { id: data.hotelId },
                select: { hasPromotions: true }
            });
            if (hotel && !hotel.hasPromotions) {
                throw new common_1.BadRequestException('Your current plan does not support Promotions. Please upgrade to PRO or higher to create discount codes.');
            }
        }
        const existing = await this.prisma.promotion.findUnique({
            where: { code: data.code }
        });
        if (existing) {
            throw new common_1.BadRequestException('Promotion code already exists');
        }
        return this.prisma.promotion.create({
            data: {
                ...data,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate)
            }
        });
    }
    async findAll(hotelId) {
        return this.prisma.promotion.findMany({
            orderBy: { createdAt: 'desc' },
            where: hotelId ? {
                OR: [{ hotelId }, { hotelId: null }]
            } : undefined
        });
    }
    async findOne(id) {
        return this.prisma.promotion.findUnique({ where: { id } });
    }
    async remove(id) {
        return this.prisma.promotion.delete({ where: { id } });
    }
    async update(id, data) {
        if (data.code) {
            const existing = await this.prisma.promotion.findUnique({ where: { code: data.code } });
            if (existing && existing.id !== id)
                throw new common_1.BadRequestException('Code already exists');
        }
        return this.prisma.promotion.update({
            where: { id },
            data: {
                ...data,
                startDate: data.startDate ? new Date(data.startDate) : undefined,
                endDate: data.endDate ? new Date(data.endDate) : undefined
            }
        });
    }
    async validateCode(code, purchaseAmount) {
        const promo = await this.prisma.promotion.findUnique({
            where: { code }
        });
        if (!promo) {
            throw new common_1.NotFoundException('Invalid promo code');
        }
        const now = new Date();
        if (now < promo.startDate || now > promo.endDate) {
            throw new common_1.BadRequestException('Promotion expired or not yet active');
        }
        let discountAmount = 0;
        if (promo.type === 'percent') {
            discountAmount = Math.floor(purchaseAmount * (promo.value / 100));
        }
        else {
            discountAmount = promo.value;
        }
        if (discountAmount > purchaseAmount) {
            discountAmount = purchaseAmount;
        }
        return {
            valid: true,
            code: promo.code,
            type: promo.type,
            value: promo.value,
            discountAmount
        };
    }
};
exports.PromotionsService = PromotionsService;
exports.PromotionsService = PromotionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PromotionsService);
//# sourceMappingURL=promotions.service.js.map