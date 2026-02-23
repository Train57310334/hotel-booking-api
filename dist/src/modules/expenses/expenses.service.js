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
exports.ExpensesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ExpensesService = class ExpensesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        return this.prisma.expense.create({
            data: {
                hotelId: data.hotelId,
                title: data.title,
                amount: data.amount,
                date: new Date(data.date),
                category: data.category || 'general',
            },
        });
    }
    async findAll(hotelId, from, to) {
        const where = { hotelId };
        if (from && to) {
            where.date = {
                gte: new Date(from),
                lte: new Date(to),
            };
        }
        return this.prisma.expense.findMany({
            where,
            orderBy: { date: 'desc' },
        });
    }
    async update(id, data) {
        return this.prisma.expense.update({
            where: { id },
            data: {
                ...data,
                ...(data.date && { date: new Date(data.date) })
            },
        });
    }
    async delete(id) {
        return this.prisma.expense.delete({
            where: { id },
        });
    }
};
exports.ExpensesService = ExpensesService;
exports.ExpensesService = ExpensesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExpensesService);
//# sourceMappingURL=expenses.service.js.map