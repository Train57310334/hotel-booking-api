import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
export declare class PromotionsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: Prisma.PromotionUncheckedCreateInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hotelId: string | null;
        code: string;
        type: string;
        value: number;
        startDate: Date;
        endDate: Date;
        conditions: string | null;
    }>;
    findAll(hotelId?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hotelId: string | null;
        code: string;
        type: string;
        value: number;
        startDate: Date;
        endDate: Date;
        conditions: string | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hotelId: string | null;
        code: string;
        type: string;
        value: number;
        startDate: Date;
        endDate: Date;
        conditions: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hotelId: string | null;
        code: string;
        type: string;
        value: number;
        startDate: Date;
        endDate: Date;
        conditions: string | null;
    }>;
    update(id: string, data: Prisma.PromotionUncheckedUpdateInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hotelId: string | null;
        code: string;
        type: string;
        value: number;
        startDate: Date;
        endDate: Date;
        conditions: string | null;
    }>;
    validateCode(code: string, purchaseAmount: number): Promise<{
        valid: boolean;
        code: string;
        type: string;
        value: number;
        discountAmount: number;
    }>;
}
//# sourceMappingURL=promotions.service.d.ts.map