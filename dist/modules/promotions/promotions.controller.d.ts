import { PromotionsService } from './promotions.service';
export declare class PromotionsController {
    private readonly promotionsService;
    constructor(promotionsService: PromotionsService);
    validate(body: {
        code: string;
        amount: number;
    }): Promise<{
        valid: boolean;
        code: string;
        type: string;
        value: number;
        discountAmount: number;
    }>;
    create(body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hotelId: string | null;
        value: number;
        type: string;
        startDate: Date;
        endDate: Date;
        code: string;
        conditions: string | null;
    }>;
    findAll(hotelId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hotelId: string | null;
        value: number;
        type: string;
        startDate: Date;
        endDate: Date;
        code: string;
        conditions: string | null;
    }[]>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hotelId: string | null;
        value: number;
        type: string;
        startDate: Date;
        endDate: Date;
        code: string;
        conditions: string | null;
    }>;
    update(id: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hotelId: string | null;
        value: number;
        type: string;
        startDate: Date;
        endDate: Date;
        code: string;
        conditions: string | null;
    }>;
}
//# sourceMappingURL=promotions.controller.d.ts.map