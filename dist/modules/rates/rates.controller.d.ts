import { RatesService } from './rates.service';
export declare class RatesController {
    private readonly ratesService;
    constructor(ratesService: RatesService);
    createPlan(body: any): Promise<{
        id: string;
        name: string;
        hotelId: string;
        roomTypeId: string | null;
        includesBreakfast: boolean;
        cancellationRule: string | null;
        adultPricePolicy: string | null;
        childPricePolicy: string | null;
    }>;
    getPlans(hotelId: string): Promise<({
        roomType: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            images: string[];
            amenities: string[];
            hotelId: string;
            bedConfig: string | null;
            sizeSqm: number | null;
            basePrice: number | null;
            maxAdults: number;
            maxChildren: number;
            isFeatured: boolean;
            deletedAt: Date | null;
        };
    } & {
        id: string;
        name: string;
        hotelId: string;
        roomTypeId: string | null;
        includesBreakfast: boolean;
        cancellationRule: string | null;
        adultPricePolicy: string | null;
        childPricePolicy: string | null;
    })[]>;
    updatePlan(id: string, body: any): Promise<{
        id: string;
        name: string;
        hotelId: string;
        roomTypeId: string | null;
        includesBreakfast: boolean;
        cancellationRule: string | null;
        adultPricePolicy: string | null;
        childPricePolicy: string | null;
    }>;
    deletePlan(id: string): Promise<{
        id: string;
        name: string;
        hotelId: string;
        roomTypeId: string | null;
        includesBreakfast: boolean;
        cancellationRule: string | null;
        adultPricePolicy: string | null;
        childPricePolicy: string | null;
    }>;
    upsertOverride(body: any): Promise<{
        id: string;
        roomTypeId: string;
        ratePlanId: string;
        date: Date;
        baseRate: number;
        reason: string | null;
    }>;
    upsertOverrideBulk(body: any): Promise<{
        id: string;
        roomTypeId: string;
        ratePlanId: string;
        date: Date;
        baseRate: number;
        reason: string | null;
    }[]>;
    getOverrides(roomTypeId: string, start: string, end: string): Promise<{
        id: string;
        roomTypeId: string;
        ratePlanId: string;
        date: Date;
        baseRate: number;
        reason: string | null;
    }[]>;
}
//# sourceMappingURL=rates.controller.d.ts.map